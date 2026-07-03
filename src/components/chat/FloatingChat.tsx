import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronLeft, Pin, PinOff, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { useContacts, Contact } from "@/hooks/data/useContacts";
import { useChat } from "@/hooks/data/useChat";
import { useAuth } from "@/hooks/data/useAuth";

// ---------- Helpers ----------
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-orange-500",
  "bg-green-600", "bg-rose-500", "bg-teal-600",
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ---------- Sub-componentes ----------
function ContactRow({
  contact,
  onClick,
}: {
  contact: Contact;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-zinc-100 dark:border-white/5 last:border-0"
    >
      <div
        className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm ${avatarColor(contact.id)}`}
      >
        {initials(contact.display_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm text-navy dark:text-white truncate">
            {contact.display_name}
          </span>
          {contact.unread_count > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[10px] text-white font-bold">
              {contact.unread_count > 9 ? "9+" : contact.unread_count}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">{contact.email}</p>
      </div>
    </div>
  );
}

function ChatWindow({
  contact,
  onBack,
  onClose,
}: {
  contact: Contact;
  onBack: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { messages, sendMessage, sending, markRead, clearMessages } = useChat(contact.id);
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Marca como lido ao abrir
  useEffect(() => {
    markRead();
  }, [contact.id]);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await sendMessage(text);
  }

  return (
    <div className="flex flex-col h-full pointer-events-auto cursor-auto">
      {/* Header */}
      <div className="p-4 bg-zinc-50 dark:bg-navy-dark border-b border-zinc-200 dark:border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-zinc-500 hover:text-navy dark:hover:text-white transition-colors p-1 bg-white dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(contact.id)}`}
          >
            {initials(contact.display_name)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy dark:text-white leading-none">
              {contact.display_name}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">{contact.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {confirmClear ? (
            <>
              <span className="text-[10px] text-zinc-500 mr-1">Apagar histórico?</span>
              <button onClick={() => { clearMessages(); setConfirmClear(false); }}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                Sim
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="text-[10px] font-bold text-zinc-500 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                Não
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              title="Limpar histórico"
              className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-navy dark:hover:text-white transition-colors ml-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white dark:bg-navy-dark/50">
        {messages.length === 0 && (
          <p className="text-center text-xs text-zinc-400 mt-8">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}
            >
              <p
                className={`px-4 py-2 text-sm max-w-[85%] break-words rounded-2xl ${
                  isMine
                    ? "bg-accent text-white rounded-tr-sm shadow-md"
                    : "bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-navy dark:text-zinc-300 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </p>
              <span className="text-[10px] text-zinc-400 font-mono mx-1">
                {fmtTime(msg.created_at)}
              </span>
            </div>
          );
        })}
        {sending && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Loader2 size={12} className="animate-spin" />
            <span className="text-xs">Enviando...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-zinc-50 dark:bg-navy-dark border-t border-zinc-200 dark:border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Mensagem..."
          maxLength={2000}
          className="flex-1 bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-full px-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-accent transition-colors placeholder:text-zinc-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
        >
          <Send size={16} className="-ml-0.5" />
        </button>
      </div>
    </div>
  );
}

// ---------- FloatingChat principal ----------
export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const constraintsRef = useRef(null);

  const { contacts, loading, markContactRead, incrementUnread } = useContacts();

  // Badge total de não lidas no botão flutuante
  const totalUnread = contacts.reduce((sum, c) => sum + c.unread_count, 0);

  // Escuta novas mensagens globalmente para incrementar badge na lista
  // (já tratado pelo refetch periódico e pelo useChat ao abrir conversa)
  useEffect(() => {
    // Mantém a referência de incrementUnread para uso externo se necessário
    void incrementUnread;
  }, [incrementUnread]);

  function handleSelectContact(contact: Contact) {
    setSelectedContact(contact);
    markContactRead(contact.id);
  }

  function handleClose() {
    setIsOpen(false);
    setSelectedContact(null);
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 lg:bottom-8 lg:right-8 w-12 h-12 lg:w-14 lg:h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl z-50 hover:shadow-primary/50 transition-shadow"
      >
        <MessageSquare size={24} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <>
      {!isPinned && (
        <div ref={constraintsRef} className="fixed inset-0 z-40 pointer-events-none" />
      )}

      <AnimatePresence>
        <motion.div
          drag={!isPinned}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "fixed",
            ...(isPinned
              ? window.innerWidth < 1024
                ? { bottom: "calc(4.5rem + env(safe-area-inset-bottom))", right: "0.5rem" }
                : { bottom: "2rem", right: "2rem" }
              : { top: "20%", left: "50%", x: "-50%" }),
          }}
          className={`w-[calc(100vw-1rem)] max-w-[350px] bg-white dark:bg-[#151515] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col h-[500px] ${
            !isPinned ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {!selectedContact ? (
            // LISTA DE CONTATOS
            <>
              <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-[#151515]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
                  <span className="font-bold font-mono text-sm tracking-widest text-navy dark:text-white">
                    MENSAGENS
                  </span>
                  {totalUnread > 0 && (
                    <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isPinned
                        ? "bg-primary/10 text-white"
                        : "text-zinc-500 hover:text-navy dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/5"
                    }`}
                    title={isPinned ? "Tornar flutuante" : "Fixar na lateral"}
                  >
                    {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 text-zinc-500 hover:text-navy dark:hover:text-white transition-colors hover:bg-zinc-200 dark:hover:bg-white/5 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pointer-events-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-zinc-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-zinc-400 text-center px-6">
                      Nenhum contato disponível ainda.
                    </p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onClick={() => handleSelectContact(contact)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <ChatWindow
              contact={selectedContact}
              onBack={() => setSelectedContact(null)}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
