import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Crown, Loader2, ShieldAlert } from "lucide-react";
import { useVIPPredictions, VIPPredictionInput, VIPPredictionRow, VIPSection, VIPSelection } from "@/hooks/useVIPPredictions";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface AdminVIPScreenProps {
  onClose: () => void;
}

const emptyForm = (): VIPPredictionInput => ({
  section: "A",
  home_team: "",
  away_team: "",
  league: "",
  kickoff: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  prediction: "",
  selection: "home",
  odds: 1.5,
  confidence: 75,
  analysis: "",
  is_active: true,
});

const AdminVIPScreen = ({ onClose }: AdminVIPScreenProps) => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { predictions, loading, create, update, remove } = useVIPPredictions();
  const [form, setForm] = useState<VIPPredictionInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const startEdit = (p: VIPPredictionRow) => {
    setEditingId(p.id);
    setForm({
      section: p.section,
      home_team: p.home_team,
      away_team: p.away_team,
      league: p.league,
      kickoff: new Date(p.kickoff).toISOString().slice(0, 16),
      prediction: p.prediction,
      selection: p.selection,
      odds: Number(p.odds),
      confidence: p.confidence,
      analysis: p.analysis || "",
      is_active: p.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => { setForm(emptyForm()); setEditingId(null); };

  const submit = async () => {
    if (!form.home_team || !form.away_team || !form.league || !form.prediction) {
      toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    const payload = { ...form, kickoff: new Date(form.kickoff).toISOString() };
    const res = editingId ? await update(editingId, payload) : await create(payload);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editingId ? "Prediction updated" : "Prediction added");
    reset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this VIP prediction?")) return;
    const { error } = await remove(id);
    if (error) toast.error(error.message);
    else toast.success("Deleted");
  };

  if (roleLoading) {
    return (
      <motion.div className="fixed inset-0 z-50 bg-background flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </motion.div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
      >
        <ShieldAlert className="w-12 h-12 text-destructive mb-3" />
        <h2 className="font-bold text-lg text-foreground mb-1">Admin access required</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Only admins can manage VIP predictions.
        </p>
        <button onClick={onClose} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h1 className="font-bold text-lg text-foreground">Admin · VIP Picks</h1>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Form */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-base">
              {editingId ? "Edit prediction" : "Add new prediction"}
            </h2>
            {editingId && (
              <button onClick={reset} className="text-xs text-primary">Cancel edit</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Section">
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value as VIPSection })}
                className="input"
              >
                {(["A", "B", "C", "E"] as VIPSection[]).map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </Field>
            <Field label="Selection">
              <select
                value={form.selection}
                onChange={(e) => setForm({ ...form, selection: e.target.value as VIPSelection })}
                className="input"
              >
                <option value="home">Home</option>
                <option value="draw">Draw</option>
                <option value="away">Away</option>
              </select>
            </Field>
            <Field label="Home team">
              <input className="input" value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} />
            </Field>
            <Field label="Away team">
              <input className="input" value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} />
            </Field>
            <Field label="League" full>
              <input className="input" value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} />
            </Field>
            <Field label="Kickoff" full>
              <input type="datetime-local" className="input" value={form.kickoff}
                onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
            </Field>
            <Field label="Prediction" full>
              <input className="input" placeholder="e.g. Over 2.5 Goals"
                value={form.prediction} onChange={(e) => setForm({ ...form, prediction: e.target.value })} />
            </Field>
            <Field label="Odds">
              <input type="number" step="0.01" min={1.01} className="input"
                value={form.odds} onChange={(e) => setForm({ ...form, odds: parseFloat(e.target.value) || 1.01 })} />
            </Field>
            <Field label="Confidence %">
              <input type="number" min={1} max={100} className="input"
                value={form.confidence} onChange={(e) => setForm({ ...form, confidence: parseInt(e.target.value) || 75 })} />
            </Field>
            <Field label="Analysis" full>
              <textarea rows={2} className="input" value={form.analysis || ""}
                onChange={(e) => setForm({ ...form, analysis: e.target.value })} />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.is_active ?? true}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active (visible to VIP members)
            </label>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingId ? "Save changes" : "Add prediction"}
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          <h2 className="font-bold text-foreground text-base">All VIP predictions ({predictions.length})</h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <AnimatePresence>
              {predictions.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="glass-card p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">SEC {p.section}</span>
                        {!p.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">HIDDEN</span>}
                        <span className="text-[10px] text-muted-foreground truncate">{p.league}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{p.home_team} vs {p.away_team}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.prediction} · {Number(p.odds).toFixed(2)} · {p.confidence}% · {new Date(p.kickoff).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted">
                        <Pencil className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center hover:bg-destructive/20">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Field = ({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) => (
  <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
    {children}
  </label>
);

export default AdminVIPScreen;
