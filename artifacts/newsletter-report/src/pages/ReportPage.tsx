import { useState, useRef, useCallback } from "react";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PIE_COLORS = ["#2563eb", "#1e40af", "#60a5fa", "#93c5fd", "#bfdbfe", "#1d4ed8", "#3b82f6"];
const BAR_COLOR = "#2563eb";

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
  const radius = outerRadius + 30;
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
      fontSize={9}
      fontWeight={500}
    >
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em">{formattedVal}</tspan>
    </text>
  );
}

/** Inline editable heading — looks like styled text, acts as an input */
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

/** Inline editable cell input */
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

  const exportPNG = useCallback(async () => {
    if (!reportRef.current) return;
    // Temporarily hide delete buttons
    const btns = reportRef.current.querySelectorAll<HTMLElement>(".delete-btn");
    btns.forEach((b) => (b.style.display = "none"));
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    btns.forEach((b) => (b.style.display = ""));
    const link = document.createElement("a");
    link.download = "newsletter-report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const exportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    const btns = reportRef.current.querySelectorAll<HTMLElement>(".delete-btn");
    btns.forEach((b) => (b.style.display = "none"));
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    btns.forEach((b) => (b.style.display = ""));
    const imgData = canvas.toDataURL("image/png");
    const pdfW = canvas.width * 0.264583;
    const pdfH = canvas.height * 0.264583;
    const pdf = new jsPDF({
      orientation: pdfW > pdfH ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfW, pdfH],
    });
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save("newsletter-report.pdf");
  }, []);

  const pieOpenData = rows.map((r) => ({ name: r.month, value: parseFloat(r.openRate) || 0 }));
  const pieClickData = rows.map((r) => ({ name: r.month, value: parseFloat(r.clickRate) || 0 }));
  const barData = rows.map((r) => ({ name: r.month, value: parseFloat(r.optinSubscribers) || 0 }));
  const chartHeight = Math.max(220, 180 + rows.length * 10);
  const outerRadius = Math.min(75, 55 + rows.length * 2);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Toolbar */}
      <div className="max-w-[1200px] mx-auto mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={addRow} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition">
            + Add Month
          </button>
          <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 transition">
            Upload Logo
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>
        <div className="flex gap-2">
          <button onClick={exportPNG} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition">
            Download PNG
          </button>
          <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition">
            Download PDF
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
            className="text-xl font-bold tracking-widest uppercase text-white placeholder-white/50"
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
                    {/* Editable column headers */}
                    <th className="py-2 px-3 text-left font-semibold border border-blue-400">
                      <EditableHeading
                        value={labels.colMonth}
                        onChange={(v) => updateLabel("colMonth", v)}
                        className="text-white text-sm font-semibold text-left"
                      />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading
                        value={labels.colOptinSubscribers}
                        onChange={(v) => updateLabel("colOptinSubscribers", v)}
                        className="text-white text-sm font-semibold text-right"
                      />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading
                        value={labels.colOpenRate}
                        onChange={(v) => updateLabel("colOpenRate", v)}
                        className="text-white text-sm font-semibold text-right"
                      />
                    </th>
                    <th className="py-2 px-3 text-right font-semibold border border-blue-400">
                      <EditableHeading
                        value={labels.colClickRate}
                        onChange={(v) => updateLabel("colClickRate", v)}
                        className="text-white text-sm font-semibold text-right"
                      />
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
                        <button
                          onClick={() => removeRow(row.id)}
                          className="text-red-500 hover:text-red-700 font-bold text-base leading-none"
                          title="Remove month"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="border-t-2 border-[#1e3a5f] mt-2">
          <div className="flex flex-wrap">
            {/* Open Rate Pie */}
            <div className="flex-1 min-w-[300px] border-r border-gray-200 p-3">
              <EditableHeading
                value={labels.chartOpenRate}
                onChange={(v) => updateLabel("chartOpenRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 block"
              />
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
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

            {/* Click Rate Pie */}
            <div className="flex-1 min-w-[300px] border-r border-gray-200 p-3">
              <EditableHeading
                value={labels.chartClickRate}
                onChange={(v) => updateLabel("chartClickRate", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-2 block"
              />
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
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

            {/* Optin Subscribers Bar */}
            <div className="flex-1 min-w-[300px] p-3">
              <EditableHeading
                value={labels.chartOptinSubscribers}
                onChange={(v) => updateLabel("chartOptinSubscribers", v)}
                className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] mb-1 block"
              />
              <EditableHeading
                value={labels.bannerAdImpressions}
                onChange={(v) => updateLabel("bannerAdImpressions", v)}
                className="text-[10px] text-gray-500 mb-1 block normal-case tracking-normal"
              />
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="value" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
