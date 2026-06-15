import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfig } from '@/hooks/api/useConfig';
import { getAccessToken, getServerUrl } from '@/utils/localstorageCredentials';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

function ItemCard({ itemId }: { itemId: string }) {
    const serverUrl = getServerUrl();
    const posterUrl = serverUrl
        ? `${serverUrl}/Items/${itemId}/Images/Primary?width=100`
        : null;

    return (
        <Link
            to={`/item/${itemId}`}
            className="inline-flex items-center gap-2 rounded-lg border bg-card text-card-foreground p-2 my-1 hover:bg-accent transition-colors no-underline max-w-[200px]"
        >
            {posterUrl && (
                <img
                    src={posterUrl}
                    alt=""
                    className="w-10 h-14 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            )}
            <span className="text-sm font-medium truncate">Open item</span>
        </Link>
    );
}

function MessageContent({ content }: { content: string }) {
    // Split on item:// links and render item cards inline
    const parts = content.split(/(\[.*?\]\(item:\/\/[^)]+\))/g);

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            {parts.map((part, i) => {
                const match = part.match(/\[(.*?)\]\(item:\/\/([^)]+)\)/);
                if (match) {
                    return (
                        <span key={i} className="inline-block align-middle mx-1">
                            <Link
                                to={`/item/${match[2]}`}
                                className="inline-flex items-center gap-2 rounded-lg border bg-card text-card-foreground px-2 py-1 hover:bg-accent transition-colors no-underline text-sm font-medium"
                            >
                                <img
                                    src={`${getServerUrl()}/Items/${match[2]}/Images/Primary?width=80`}
                                    alt={match[1]}
                                    className="w-8 h-11 object-cover rounded flex-shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                {match[1]}
                            </Link>
                        </span>
                    );
                }
                return (
                    <ReactMarkdown key={i}>
                        {part}
                    </ReactMarkdown>
                );
            })}
        </div>
    );
}

export function ChatPanel() {
    const { config } = useConfig();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Resolve the StreamyStats server ID that matches the user's Jellyfin server URL.
    // Cached in a ref so we only fetch it once per session.
    const serverIdRef = useRef<number | null>(null);

    const resolveServerId = useCallback(async (statsUrl: string, token: string | null): Promise<number> => {
        if (serverIdRef.current !== null) return serverIdRef.current;

        const jellyfinUrl = getServerUrl();
        try {
            const res = await fetch(`${statsUrl}/api/servers`, {
                headers: token ? { Authorization: `MediaBrowser Token="${token}"` } : {},
            });
            if (res.ok) {
                const data = await res.json() as { id: number; url?: string; serverUrl?: string }[];
                const servers = Array.isArray(data) ? data : (data as { servers?: typeof data }).servers ?? [];
                const match = jellyfinUrl
                    ? servers.find((s) => {
                          const u = s.url ?? s.serverUrl ?? '';
                          return u.replace(/\/$/, '') === jellyfinUrl.replace(/\/$/, '');
                      })
                    : null;
                const id = match?.id ?? servers[0]?.id ?? 1;
                serverIdRef.current = id;
                return id;
            }
        } catch { /* fall through to default */ }
        serverIdRef.current = 1;
        return 1;
    }, []);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isStreaming || !config?.streamystatsUrl) return;

        const userMessage: Message = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsStreaming(true);

        const token = getAccessToken();
        setMessages([...newMessages, { role: 'assistant', content: '' }]);

        abortRef.current = new AbortController();

        const setLastMsg = (content: string) =>
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content };
                return updated;
            });

        try {
            const serverId = await resolveServerId(config.streamystatsUrl, token);

            const response = await fetch(`${config.streamystatsUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `MediaBrowser Token="${token}"` } : {}),
                },
                body: JSON.stringify({ messages: newMessages, serverId }),
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}${body ? ': ' + body.slice(0, 200) : ''}`);
            }

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            // Buffer incomplete lines across chunks
            let lineBuffer = '';
            let accumulated = '';

            const processLine = (line: string) => {
                // Strip SSE "data: " prefix if present
                const raw = line.startsWith('data: ') ? line.slice(6) : line;
                if (!raw || raw === '[DONE]') return;

                // Vercel AI SDK data stream: `0:"text delta"`
                if (raw.startsWith('0:')) {
                    try {
                        accumulated += JSON.parse(raw.slice(2)) as string;
                    } catch { /* skip */ }
                    return;
                }

                // Plain JSON fallback: { content: "..." } or { text: "..." }
                if (raw.startsWith('{')) {
                    try {
                        const obj = JSON.parse(raw) as Record<string, unknown>;
                        const text =
                            (obj.content as string) ??
                            (obj.text as string) ??
                            (obj.delta as string) ??
                            ((obj.choices as { delta?: { content?: string } }[])?.[0]?.delta?.content);
                        if (typeof text === 'string') accumulated += text;
                    } catch { /* skip */ }
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split('\n');
                // Keep the last (possibly incomplete) fragment in the buffer
                lineBuffer = lines.pop() ?? '';

                for (const line of lines) {
                    processLine(line.trim());
                }
                setLastMsg(accumulated);
            }

            // Process any remaining buffered content
            if (lineBuffer.trim()) processLine(lineBuffer.trim());
            setLastMsg(accumulated || '_No response received._');

        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                const msg = (err as Error).message ?? 'Unknown error';
                setLastMsg(`_Error: ${msg}_`);
            }
        } finally {
            setIsStreaming(false);
            abortRef.current = null;
        }
    }, [input, isStreaming, messages, config?.streamystatsUrl]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!config?.streamystatsUrl) return null;

    return (
        <>
            {/* Floating action button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
                    aria-label="Open AI Chat"
                >
                    <MessageCircle className="h-6 w-6" />
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[560px] max-h-[80vh] rounded-2xl border bg-background shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
                        <Bot className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-sm flex-1">Streamystats AI</span>
                        <button
                            onClick={() => {
                                abortRef.current?.abort();
                                setOpen(false);
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                <Bot className="h-10 w-10 opacity-30" />
                                <p className="text-sm">
                                    Ask me about your watch stats, get film recommendations, or search your library.
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                                            : 'bg-muted rounded-bl-sm'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <MessageContent content={msg.content} />
                                    ) : (
                                        <span>{msg.content}</span>
                                    )}
                                    {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                                        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 px-3 py-3 border-t">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your media…"
                            disabled={isStreaming}
                            className="flex-1 rounded-full text-sm"
                        />
                        <Button
                            size="icon"
                            onClick={sendMessage}
                            disabled={!input.trim() || isStreaming}
                            className="rounded-full h-9 w-9 flex-shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ItemCard;
