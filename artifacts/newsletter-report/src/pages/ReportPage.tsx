import { useState, useRef, useCallback } from "react";
import appLogo from "@assets/ramanan_1774446414560.png";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const PIE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#6366f1", // indigo
];

const BAR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

interface MonthRow {
  id: string;
  month: string;
  optinSubscribers: string;
  openRate: string;
  clickRate: string;
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
  { id: "1", month: "Oct-25", optinSubscribers: "95674", openRate: "57404.4", clickRate: "6888.77" },
  { id: "2", month: "Nov-25", optinSubscribers: "97454", openRate: "56472.3", clickRate: "6778.48" },
  { id: "3", month: "Dec-25", optinSubscribers: "94568", openRate: "58740.8", clickRate: "7254.25" },
  { id: "4", month: "Jan-26", optinSubscribers: "98453", openRate: "59071.8", clickRate: "7012.36" },
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

function renderCustomPieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  value: number;
}) {
  const radius = outerRadius + 34;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const formattedVal = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <text
      x={x}
      y={y}
      fill="#1e293b"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={10}
      fontWeight={500}
    >
      <tspan x={x} dy="-0.55em">{name}</tspan>
      <tspan x={x} dy="1.3em">{formattedVal}</tspan>
    </text>
  );
}

function EditableHeading({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
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

function EditableCell({
  value,
  onChange,
  align = "left",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
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

function InfoRow({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="mb-3">
      <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-blue-300 text-xs"> : </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white resize-none w-full leading-snug text-white text-sm"
          rows={2}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-b border-dashed border-blue-400 focus:outline-none focus:border-white w-full text-white text-sm"
        />
      )}
    </div>
  );
}

function sumCol(rows: MonthRow[], key: "optinSubscribers" | "openRate" | "clickRate"): string {
  const total = rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  if (Number.isInteger(total)) return total.toLocaleString();
  return total.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ReportPage() {
  const [info, setInfo] = useState<ReportInfo>(defaultInfo);
  const [rows, setRows] = useState<MonthRow[]>(defaultRows);
  const [labels, setLabels] = useState<Labels>(defaultLabels);
  const [logo, setLogo] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateInfo = (key: keyof ReportInfo, value: string) =>
    setInfo((prev) => ({ ...prev, [key]: value }));

  const updateLabel = (key: keyof Labels, value: string) =>
    setLabels((prev) => ({ ...prev, [key]: value }));

  const updateRow = (id: string, key: keyof MonthRow, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: Date.now().toString(), month: "Mon-YY", optinSubscribers: "0", openRate: "0", clickRate: "0" },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const captureImage = useCallback(async (): Promise<string | null> => {
    if (!reportRef.current) return null;
    const btns = reportRef.current.querySelectorAll<HTMLElement>(".delete-btn");
    btns.forEach((b) => (b.style.visibility = "hidden"));
    try {
      // Run twice — first pass warms up font/image cache
      await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      return dataUrl;
    } finally {
      btns.forEach((b) => (b.style.visibility = ""));
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
    const pdf = new jsPDF({
      orientation: pdfW > pdfH ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfW, pdfH],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
    pdf.save("newsletter-report.pdf");
  }, [captureImage]);

  const pieOpenData = rows.map((r) => ({ name: r.month, value: parseFloat(r.openRate) || 0 }));
  const pieClickData = rows.map((r) => ({ name: r.month, value: parseFloat(r.clickRate) || 0 }));
  const barData = rows.map((r) => ({ name: r.month, value: parseFloat(r.optinSubscribers) || 0 }));

  // Chart sizing — grows with more months
  const chartHeight = Math.max(300, 260 + rows.length * 12);
  const outerRadius = Math.min(95, 72 + rows.length * 3);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* App Header / Toolbar */}
      <div className="max-w-[1200px] mx-auto mb-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2 flex flex-wrap gap-2 items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Ramanan" className="h-10 w-10 rounded-full object-cover shadow-sm" />
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">Ramanan</p>
            <p className="text-xs text-gray-500 leading-tight">Report Generator</p>
          </div>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <button onClick={addRow} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition">
            + Add Month
          </button>
          <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1.5 bg-slate-500 text-white text-xs font-medium rounded hover:bg-slate-600 transition">
            Upload Report Logo
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>
        {/* Export */}
        <div className="flex gap-2">
          <button onClick={exportPNG} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 transition">
            ↓ PNG
          </button>
          <button onClick={exportPDF} className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition">
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Report */}
      <div
        ref={reportRef}
        className="max-w-[1200px] mx-auto bg-white shadow-lg"
        style={{ fontFamily: "'Calibri', 'Arial', sans-serif" }}
      >
        {/* Header — editable title */}
        <div className="bg-[#1e3a5f] text-white text-center py-3 px-4">
          <EditableHeading
            value={labels.reportTitle}
            onChange={(v) => updateLabel("reportTitle", v)}
            className="text-xl font-bold tracking-widest uppercase text-white"
          />
        </div>

        {/* Info + Logo + Table */}
        <div className="flex">
          {/* Info panel */}
          <div className="bg-[#1e3a5f] text-white p-5 min-w-[300px] w-[300px] flex-shrink-0">
            <InfoRow label="Client" value={info.client} onChange={(v) => updateInfo("client", v)} />
            <InfoRow label="Campaign" value={info.campaign} onChange={(v) => updateInfo("campaign", v)} />
            <InfoRow label="Period" value={info.period} onChange={(v) => updateInfo("period", v)} multiline />
            <InfoRow label="Magazine" value={info.magazine} onChange={(v) => updateInfo("magazine", v)} />
            <InfoRow label="Edition" value={info.edition} onChange={(v) => updateInfo("edition", v)} multiline />
            <InfoRow label="Link" value={info.link} onChange={(v) => updateInfo("link", v)} multiline />
          </div>

          {/* Table + Logo */}
          <div className="flex-1 flex flex-col">
            {/* Logo row */}
            <div className="flex justify-end p-3 border-b border-gray-200">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="h-14 max-w-[180px] object-contain cursor-pointer"
                  onClick={() => logoInputRef.current?.click()}
                  title="Click to change logo"
                />
              ) : (
                <div
                  className="h-14 w-40 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-blue-400 rounded"
                  onClick={() => logoInputRef.current?.click()}
                >
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
                      <td className="py-2 px-3 border border-blue-100 text-center delete-btn">
                        <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 font-bold text-base leading-none" title="Remove month">
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr className="bg-[#1e3a5f] text-white font-bold">
                    <td className="py-2 px-3 border border-blue-900">
                      <EditableHeading
                        value={labels.colTotal}
                        onChange={(v) => updateLabel("colTotal", v)}
                        className="text-white text-sm font-bold text-left"
                      />
                    </td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">
                      {sumCol(rows, "optinSubscribers")}
                    </td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">
                      {sumCol(rows, "openRate")}
                    </td>
                    <td className="py-2 px-3 border border-blue-900 text-right text-sm">
                      {sumCol(rows, "clickRate")}
                    </td>
                    <td className="py-2 px-3 border border-blue-900 delete-btn" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="border-t-2 border-[#1e3a5f] mt-1">
          <div className="grid grid-cols-3 divide-x divide-gray-200">

            {/* Open Rate Pie */}
            <div className="p-4 flex flex-col">
              <EditableHeading
                value={labels.chartOpenRate}
                onChange={(v) => updateLabel("chartOpenRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-1"
              />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <Pie
                      data={pieOpenData}
                      cx="50%"
                      cy="50%"
                      outerRadius={outerRadius}
                      dataKey="value"
                      labelLine={true}
                      label={renderCustomPieLabel}
                    >
                      {pieOpenData.map((_, index) => (
                        <Cell key={`open-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Click Rate Pie */}
            <div className="p-4 flex flex-col">
              <EditableHeading
                value={labels.chartClickRate}
                onChange={(v) => updateLabel("chartClickRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-1"
              />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <Pie
                      data={pieClickData}
                      cx="50%"
                      cy="50%"
                      outerRadius={outerRadius}
                      dataKey="value"
                      labelLine={true}
                      label={renderCustomPieLabel}
                    >
                      {pieClickData.map((_, index) => (
                        <Cell key={`click-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Optin Subscribers Bar */}
            <div className="p-4 flex flex-col">
              <EditableHeading
                value={labels.chartOptinSubscribers}
                onChange={(v) => updateLabel("chartOptinSubscribers", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] block mb-0.5"
              />
              <EditableHeading
                value={labels.bannerAdImpressions}
                onChange={(v) => updateLabel("bannerAdImpressions", v)}
                className="text-[10px] text-gray-500 block normal-case tracking-normal mb-1"
              />
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {barData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                  </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* Footer bar */}
        <div className="bg-[#1e3a5f] h-2" />
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        Click any heading, label, or field to edit it directly
      </p>
    </div>
  );
}
