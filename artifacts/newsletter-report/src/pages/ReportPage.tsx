import { useState, useRef, useCallback, useEffect } from "react";
import appLogo from "@assets/ramanan_1774446414560.png";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const CHART_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#06b6d4",
  "#8b5cf6","#ec4899","#14b8a6","#f59e0b","#6366f1",
];

type ChartType = "pie" | "bar" | "line" | "none";

interface ExtraColumn {
  id: string;
  header: string;
  chartTitle: string;
  chartType: ChartType;
}

interface MonthRow {
  id: string;
  month: string;
  optinSubscribers: string;
  openRate: string;
  clickRate: string;
  extras: Record<string, string>;
}

interface ReportInfo {
  client: string;
  campaign: string;
  period: string;
  magazine: string;
  edition: string;
  link: string;
}

interface Labels {
  reportTitle: string;
  colMonth: string;
  colOptinSubscribers: string;
  colOpenRate: string;
  colClickRate: string;
  colTotal: string;
  chartOpenRate: string;
  chartClickRate: string;
  chartOptinSubscribers: string;
  bannerAdImpressions: string;
}

const defaultRows: MonthRow[] = [
  { id:"1", month:"Oct-25", optinSubscribers:"95674", openRate:"57404.4", clickRate:"6888.77", extras:{} },
  { id:"2", month:"Nov-25", optinSubscribers:"97454", openRate:"56472.3", clickRate:"6778.48", extras:{} },
  { id:"3", month:"Dec-25", optinSubscribers:"94568", openRate:"58740.8", clickRate:"7254.25", extras:{} },
  { id:"4", month:"Jan-26", optinSubscribers:"98453", openRate:"59071.8", clickRate:"7012.36", extras:{} },
];

const defaultInfo: ReportInfo = {
  client: "Ayara",
  campaign: "Newsletter Article Insert",
  period: "October 2025 to January 2026",
  magazine: "Financial Business Outlook",
  edition: "Advanced Revenue Operations 2025 Edition",
  link: "https://financialbusinessoutlook.com/ayara/",
};

const defaultLabels: Labels = {
  reportTitle: "News Letter Report",
  colMonth: "Month",
  colOptinSubscribers: "Optin Subscribers",
  colOpenRate: "Open Rate",
  colClickRate: "Click Rate",
  colTotal: "Total",
  chartOpenRate: "Open Rate",
  chartClickRate: "Click Rate",
  chartOptinSubscribers: "Optin Subscribers",
  bannerAdImpressions: "Banner ad Impressions",
};

const RADIAN = Math.PI / 180;

function renderCustomPieLabel({ cx, cy, midAngle, outerRadius, name, value }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; name: string; value: number;
}) {
  const radius = outerRadius + 34;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const formattedVal = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fontWeight={500}>
      <tspan x={x} dy="-0.55em">{name}</tspan>
      <tspan x={x} dy="1.3em">{formattedVal}</tspan>
    </text>
  );
}

function EditableHeading({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Click to edit"
      className={`bg-transparent focus:outline-none border-b border-dashed border-current border-opacity-40 focus:border-opacity-80 text-center w-full min-w-0 ${className}`}
      style={{ cursor: "text" }}
    />
  );
}

function EditableCell({ value, onChange, align = "left", className = "" }: {
  value: string; onChange: (v: string) => void; align?: "left" | "right" | "center"; className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent focus:outline-none border-b border-dashed border-blue-300 focus:border-blue-500 w-full text-sm ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
    />
  );
}

function AutoTextarea({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      rows={1}
      style={{ overflow: "hidden" }}
    />
  );
}

function InfoRow({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div className="mb-3">
      <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-blue-300 text-xs"> : </span>
      {multiline ? (
        <AutoTextarea value={value} onChange={onChange}
          className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white resize-none w-full leading-snug text-white text-sm" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white w-full text-white text-sm" />
      )}
    </div>
  );
}

function sumFixedCol(rows: MonthRow[], key: "optinSubscribers" | "openRate" | "clickRate"): string {
  const total = rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  return Number.isInteger(total) ? total.toLocaleString() : total.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function sumExtraCol(rows: MonthRow[], colId: string): string {
  const total = rows.reduce((acc, r) => acc + (parseFloat(r.extras[colId] ?? "0") || 0), 0);
  return Number.isInteger(total) ? total.toLocaleString() : total.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ChartBlock({ title, onTitleChange, chartType, data, chartHeight, outerRadius, showDelete, onDelete }: {
  title: string;
  onTitleChange: (v: string) => void;
  chartType: ChartType;
  data: { name: string; value: number }[];
  chartHeight: number;
  outerRadius: number;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="p-4 flex flex-col relative">
      {showDelete && (
        <button
          onClick={onDelete}
          className="delete-btn absolute top-1 right-1 text-red-400 hover:text-red-600 text-xs font-bold z-10 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow"
          title="Remove chart column"
        >×</button>
      )}
      <EditableHeading value={title} onChange={onTitleChange}
        className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-1" />
      <div className="flex-1">
        {chartType === "pie" && (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <Pie data={data} cx="50%" cy="50%" outerRadius={outerRadius} dataKey="value" labelLine={true} label={renderCustomPieLabel}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        {chartType === "bar" && (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartType === "line" && (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartType === "none" && (
          <div className="flex-1 flex items-center justify-center text-gray-300 text-sm h-full" style={{ minHeight: chartHeight }}>No chart</div>
        )}
      </div>
    </div>
  );
}

interface SidebarField {
  id: string;
  label: string;
  value: string;
  multiline: boolean;
}

export default function ReportPage() {
  const [info, setInfo] = useState<ReportInfo>(defaultInfo);
  const [rows, setRows] = useState<MonthRow[]>(defaultRows);
  const [labels, setLabels] = useState<Labels>(defaultLabels);
  const [extraCols, setExtraCols] = useState<ExtraColumn[]>([]);
  const [sidebarFields, setSidebarFields] = useState<SidebarField[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("New Column");
  const [newColChart, setNewColChart] = useState<ChartType>("bar");
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("Label");
  const [newFieldMultiline, setNewFieldMultiline] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateInfo = (key: keyof ReportInfo, value: string) => setInfo((p) => ({ ...p, [key]: value }));
  const updateLabel = (key: keyof Labels, value: string) => setLabels((p) => ({ ...p, [key]: value }));

  const updateRow = (id: string, key: "month" | "optinSubscribers" | "openRate" | "clickRate", value: string) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const updateExtra = (rowId: string, colId: string, value: string) =>
    setRows((p) => p.map((r) => r.id === rowId ? { ...r, extras: { ...r.extras, [colId]: value } } : r));

  const addRow = () =>
    setRows((p) => {
      const extras: Record<string, string> = {};
      extraCols.forEach((c) => (extras[c.id] = "0"));
      return [...p, { id: Date.now().toString(), month: "Mon-YY", optinSubscribers: "0", openRate: "0", clickRate: "0", extras }];
    });

  const removeRow = (id: string) => setRows((p) => p.filter((r) => r.id !== id));

  const addColumn = () => {
    const id = Date.now().toString();
    setExtraCols((p) => [...p, { id, header: newColName, chartTitle: newColName, chartType: newColChart }]);
    setRows((p) => p.map((r) => ({ ...r, extras: { ...r.extras, [id]: "0" } })));
    setShowAddCol(false);
    setNewColName("New Column");
    setNewColChart("bar");
  };

  const removeColumn = (colId: string) => {
    setExtraCols((p) => p.filter((c) => c.id !== colId));
    setRows((p) => p.map((r) => { const e = { ...r.extras }; delete e[colId]; return { ...r, extras: e }; }));
  };

  const updateExtraColHeader = (colId: string, header: string) =>
    setExtraCols((p) => p.map((c) => c.id === colId ? { ...c, header } : c));

  const updateExtraColChartTitle = (colId: string, chartTitle: string) =>
    setExtraCols((p) => p.map((c) => c.id === colId ? { ...c, chartTitle } : c));

  const addSidebarField = () => {
    const id = Date.now().toString();
    setSidebarFields((p) => [...p, { id, label: newFieldLabel, value: "", multiline: newFieldMultiline }]);
    setShowAddField(false);
    setNewFieldLabel("Label");
    setNewFieldMultiline(false);
  };

  const removeSidebarField = (id: string) => setSidebarFields((p) => p.filter((f) => f.id !== id));

  const updateSidebarFieldLabel = (id: string, label: string) =>
    setSidebarFields((p) => p.map((f) => f.id === id ? { ...f, label } : f));

  const updateSidebarFieldValue = (id: string, value: string) =>
    setSidebarFields((p) => p.map((f) => f.id === id ? { ...f, value } : f));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const captureImage = useCallback(async (): Promise<string | null> => {
    if (!reportRef.current) return null;
    const el = reportRef.current;
    const width = el.scrollWidth;
    const height = el.scrollHeight;

    // Clone off-screen
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = "-99999px";
    clone.style.left = "0px";
    clone.style.width = width + "px";
    clone.style.maxWidth = "none";
    clone.style.overflow = "visible";
    clone.style.zIndex = "-1";

    // Replace <input> with plain <span> — copy className only (not computed styles, which have oklch colors)
    const liveInputs = Array.from(el.querySelectorAll<HTMLInputElement>("input[type=text]"));
    clone.querySelectorAll<HTMLInputElement>("input[type=text]").forEach((input, i) => {
      const span = document.createElement("span");
      span.textContent = liveInputs[i]?.value ?? input.value;
      span.className = input.className;
      span.style.border = "none";
      span.style.outline = "none";
      span.style.display = "inline-block";
      input.replaceWith(span);
    });

    // Replace <textarea> with plain <div>
    const liveTAs = Array.from(el.querySelectorAll<HTMLTextAreaElement>("textarea"));
    clone.querySelectorAll<HTMLTextAreaElement>("textarea").forEach((ta, i) => {
      const div = document.createElement("div");
      div.textContent = liveTAs[i]?.value ?? ta.value;
      div.className = ta.className;
      div.style.border = "none";
      div.style.outline = "none";
      ta.replaceWith(div);
    });

    // Remove delete buttons
    clone.querySelectorAll<HTMLElement>(".delete-btn").forEach((b) => b.remove());

    // Make SVGs overflow visible for pie labels
    clone.querySelectorAll<SVGElement>("svg").forEach((s) => (s.style.overflow = "visible"));

    // Make table wrappers fully expand
    clone.querySelectorAll<HTMLElement>(".overflow-x-auto").forEach((t) => (t.style.overflow = "visible"));

    document.body.appendChild(clone);
    try {
      const opts = { pixelRatio: 2, backgroundColor: "#ffffff", width, height, skipFonts: true };
      await toPng(clone, opts); // warm-up
      return await toPng(clone, opts);
    } finally {
      document.body.removeChild(clone);
    }
  }, []);

  const exportPNG = useCallback(async () => {
    const dataUrl = await captureImage();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = "newsletter-report.png";
    link.href = dataUrl;
    link.click();
  }, [captureImage]);

  const exportPDF = useCallback(async () => {
    const dataUrl = await captureImage();
    if (!dataUrl) return;
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res) => (img.onload = res));
    const pdfW = img.width * 0.264583;
    const pdfH = img.height * 0.264583;
    const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "mm", format: [pdfW, pdfH] });
    pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
    pdf.save("newsletter-report.pdf");
  }, [captureImage]);

  const chartHeight = Math.max(300, 260 + rows.length * 12);
  const outerRadius = Math.min(95, 72 + rows.length * 3);

  const pieOpenData  = rows.map((r) => ({ name: r.month, value: parseFloat(r.openRate) || 0 }));
  const pieClickData = rows.map((r) => ({ name: r.month, value: parseFloat(r.clickRate) || 0 }));
  const barOptinData = rows.map((r) => ({ name: r.month, value: parseFloat(r.optinSubscribers) || 0 }));
  const allChartCols = extraCols.filter((c) => c.chartType !== "none");
  const totalChartCols = 3 + allChartCols.length;

  return (
    <div className="min-h-screen bg-gray-100 p-4">

      {/* Add Column Modal */}
      {showAddCol && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAddCol(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 mb-4">Add Column</h3>
            <label className="block text-xs text-gray-500 mb-1">Column Name</label>
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-4 focus:outline-none focus:border-blue-500"
            />
            <label className="block text-xs text-gray-500 mb-2">Chart Type</label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["bar", "pie", "line", "none"] as ChartType[]).map((t) => (
                <button key={t} onClick={() => setNewColChart(t)}
                  className={`py-1.5 rounded border text-xs font-medium capitalize transition ${
                    newColChart === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}>
                  {t === "none" ? "No Chart" : `${t.charAt(0).toUpperCase() + t.slice(1)} Chart`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addColumn} className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded hover:bg-blue-700 transition">Add Column</button>
              <button onClick={() => setShowAddCol(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-1.5 rounded hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sidebar Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAddField(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-72" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 mb-4">Add Sidebar Field</h3>
            <label className="block text-xs text-gray-500 mb-1">Field Label</label>
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-4 focus:outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 mb-5 cursor-pointer">
              <input type="checkbox" checked={newFieldMultiline} onChange={(e) => setNewFieldMultiline(e.target.checked)} className="rounded" />
              Multi-line value (for longer text)
            </label>
            <div className="flex gap-2">
              <button onClick={addSidebarField} className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 rounded hover:bg-blue-700 transition">Add Field</button>
              <button onClick={() => setShowAddField(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs font-medium py-1.5 rounded hover:bg-gray-200 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="max-w-[1200px] mx-auto mb-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <img src={appLogo} alt="Ramanan" className="h-10 w-10 rounded-full object-cover shadow-sm" />
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">Ramanan</p>
            <p className="text-xs text-gray-500 leading-tight">Report Generator</p>
          </div>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <button onClick={addRow} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition">
            + Add Month
          </button>
          <button onClick={() => setShowAddCol(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition">
            + Add Column
          </button>
          <button onClick={() => setShowAddField(true)} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition">
            + Add Sidebar Field
          </button>
          <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded hover:bg-slate-600 transition">
            Upload Report Logo
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>
        <div className="flex gap-2">
          <button onClick={exportPNG} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 transition">
            ↓ PNG
          </button>
          <button onClick={exportPDF} className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition">
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Report — expands horizontally as columns are added */}
      <div
        ref={reportRef}
        className="bg-white shadow-lg mx-auto"
        style={{
          fontFamily: "'Calibri','Arial',sans-serif",
          minWidth: `${1200 + extraCols.length * 190}px`,
          width: `${1200 + extraCols.length * 190}px`,
        }}
      >

        {/* Title */}
        <div className="bg-[#1e3a5f] text-white text-center py-3 px-4">
          <EditableHeading value={labels.reportTitle} onChange={(v) => updateLabel("reportTitle", v)}
            className="text-xl font-bold tracking-widest uppercase text-white" />
        </div>

        {/* Info + Table */}
        <div className="flex">
          {/* Sidebar */}
          <div className="bg-[#1e3a5f] text-white p-5 min-w-[300px] w-[300px] flex-shrink-0 flex flex-col">
            {/* Fixed fields */}
            <InfoRow label="Client"   value={info.client}   onChange={(v) => updateInfo("client", v)} />
            <InfoRow label="Campaign" value={info.campaign} onChange={(v) => updateInfo("campaign", v)} />
            <InfoRow label="Period"   value={info.period}   onChange={(v) => updateInfo("period", v)}   multiline />
            <InfoRow label="Magazine" value={info.magazine} onChange={(v) => updateInfo("magazine", v)} />
            <InfoRow label="Edition"  value={info.edition}  onChange={(v) => updateInfo("edition", v)}  multiline />
            <InfoRow label="Link"     value={info.link}     onChange={(v) => updateInfo("link", v)}     multiline />

            {/* Dynamic extra fields */}
            {sidebarFields.map((field) => (
              <div key={field.id} className="mb-3 relative group">
                {/* Editable label */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateSidebarFieldLabel(field.id, e.target.value)}
                    className="bg-transparent text-blue-200 text-xs font-semibold uppercase tracking-wider border-none focus:outline-none focus:underline w-auto min-w-0 flex-shrink"
                    style={{ width: `${Math.max(field.label.length, 4) + 1}ch` }}
                  />
                  <span className="text-blue-300 text-xs flex-shrink-0"> : </span>
                  <button
                    onClick={() => removeSidebarField(field.id)}
                    className="delete-btn ml-auto text-red-300 hover:text-red-100 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove field"
                  >×</button>
                </div>
                {/* Value */}
                {field.multiline ? (
                  <AutoTextarea
                    value={field.value}
                    onChange={(v) => updateSidebarFieldValue(field.id, v)}
                    className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white resize-none w-full leading-snug text-white text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateSidebarFieldValue(field.id, e.target.value)}
                    className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white w-full text-white text-sm"
                  />
                )}
              </div>
            ))}

            {/* Add Field button */}
            <button
              onClick={() => setShowAddField(true)}
              className="delete-btn mt-2 text-blue-300 hover:text-white text-xs border border-dashed border-blue-500 hover:border-white rounded px-2 py-1 transition self-start"
            >
              + Add Field
            </button>
          </div>

          {/* Table area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Logo row */}
            <div className="flex justify-end p-3 border-b border-gray-200">
              {logo ? (
                <img src={logo} alt="Logo" className="h-14 max-w-[180px] object-contain cursor-pointer"
                  onClick={() => logoInputRef.current?.click()} title="Click to change logo" />
              ) : (
                <div className="h-14 w-40 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-blue-400 rounded"
                  onClick={() => logoInputRef.current?.click()}>
                  Click to upload logo
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#2563eb] text-white">
                    <th className="py-2 px-3 text-left font-semibold border border-blue-400">
                      <EditableHeading value={labels.colMonth} onChange={(v) => updateLabel("colMonth", v)} className="text-white text-sm font-semibold text-left" />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading value={labels.colOptinSubscribers} onChange={(v) => updateLabel("colOptinSubscribers", v)} className="text-white text-sm font-semibold text-right" />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading value={labels.colOpenRate} onChange={(v) => updateLabel("colOpenRate", v)} className="text-white text-sm font-semibold text-right" />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading value={labels.colClickRate} onChange={(v) => updateLabel("colClickRate", v)} className="text-white text-sm font-semibold text-right" />
                    </th>
                    {extraCols.map((col) => (
                      <th key={col.id} className="py-2 px-3 text-right font-semibold border border-blue-400 relative">
                        <EditableHeading value={col.header} onChange={(v) => updateExtraColHeader(col.id, v)} className="text-white text-sm font-semibold text-right pr-4" />
                        <button onClick={() => removeColumn(col.id)} className="delete-btn absolute top-1 right-1 text-red-200 hover:text-white text-xs font-bold" title="Remove column">×</button>
                      </th>
                    ))}
                    <th className="py-2 px-3 border border-blue-400 w-8 delete-btn" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? "bg-[#eff6ff]" : "bg-white"}>
                      <td className="py-2 px-3 border border-blue-100">
                        <EditableCell value={row.month} onChange={(v) => updateRow(row.id, "month", v)} className="font-medium text-[#1e3a5f]" />
                      </td>
                      <td className="py-2 px-3 border border-blue-100">
                        <EditableCell value={row.optinSubscribers} onChange={(v) => updateRow(row.id, "optinSubscribers", v)} align="right" />
                      </td>
                      <td className="py-2 px-3 border border-blue-100">
                        <EditableCell value={row.openRate} onChange={(v) => updateRow(row.id, "openRate", v)} align="right" />
                      </td>
                      <td className="py-2 px-3 border border-blue-100">
                        <EditableCell value={row.clickRate} onChange={(v) => updateRow(row.id, "clickRate", v)} align="right" />
                      </td>
                      {extraCols.map((col) => (
                        <td key={col.id} className="py-2 px-3 border border-blue-100">
                          <EditableCell value={row.extras[col.id] ?? "0"} onChange={(v) => updateExtra(row.id, col.id, v)} align="right" />
                        </td>
                      ))}
                      <td className="py-2 px-3 border border-blue-100 text-center delete-btn">
                        <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 font-bold text-base leading-none" title="Remove month">×</button>
                      </td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr className="bg-[#1e3a5f] text-white font-bold">
                    <td className="py-2 px-3 border border-blue-900">
                      <EditableHeading value={labels.colTotal} onChange={(v) => updateLabel("colTotal", v)} className="text-white text-sm font-bold text-left" />
                    </td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">{sumFixedCol(rows, "optinSubscribers")}</td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">{sumFixedCol(rows, "openRate")}</td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">{sumFixedCol(rows, "clickRate")}</td>
                    {extraCols.map((col) => (
                      <td key={col.id} className="py-2 px-3 border border-blue-900 text-right text-sm">{sumExtraCol(rows, col.id)}</td>
                    ))}
                    <td className="py-2 px-3 border border-blue-900 delete-btn" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="border-t-2 border-[#1e3a5f] mt-1">
          <div className={`grid divide-x divide-gray-200`} style={{ gridTemplateColumns: `repeat(${totalChartCols}, minmax(0, 1fr))` }}>

            {/* Open Rate Pie */}
            <div className="p-4 flex flex-col">
              <EditableHeading value={labels.chartOpenRate} onChange={(v) => updateLabel("chartOpenRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-1" />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <Pie data={pieOpenData} cx="50%" cy="50%" outerRadius={outerRadius} dataKey="value" labelLine label={renderCustomPieLabel}>
                      {pieOpenData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Click Rate Pie */}
            <div className="p-4 flex flex-col">
              <EditableHeading value={labels.chartClickRate} onChange={(v) => updateLabel("chartClickRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-1" />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <Pie data={pieClickData} cx="50%" cy="50%" outerRadius={outerRadius} dataKey="value" labelLine label={renderCustomPieLabel}>
                      {pieClickData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Optin Subscribers Bar */}
            <div className="p-4 flex flex-col">
              <EditableHeading value={labels.chartOptinSubscribers} onChange={(v) => updateLabel("chartOptinSubscribers", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-0.5" />
              <EditableHeading value={labels.bannerAdImpressions} onChange={(v) => updateLabel("bannerAdImpressions", v)}
                className="text-[10px] text-gray-500 block normal-case tracking-normal mb-1" />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={barOptinData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {barOptinData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Extra column charts */}
            {allChartCols.map((col) => (
              <ChartBlock
                key={col.id}
                title={col.chartTitle}
                onTitleChange={(v) => updateExtraColChartTitle(col.id, v)}
                chartType={col.chartType}
                data={rows.map((r) => ({ name: r.month, value: parseFloat(r.extras[col.id] ?? "0") || 0 }))}
                chartHeight={chartHeight}
                outerRadius={outerRadius}
                showDelete
                onDelete={() => removeColumn(col.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
