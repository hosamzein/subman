import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ServiceDistributionItem = {
  name: string;
  value: number;
};

export type IncomeDistributionItem = {
  name: string;
  amount: number;
};

type AnalyticsChartsProps = {
  axisColor: string;
  barColor: string;
  colors: string[];
  gridColor: string;
  incomeDist: IncomeDistributionItem[];
  incomeLabel: string;
  serviceDist: ServiceDistributionItem[];
  serviceLabel: string;
  textColor: string;
};

export default function AnalyticsCharts({
  axisColor,
  barColor,
  colors,
  gridColor,
  incomeDist,
  incomeLabel,
  serviceDist,
  serviceLabel,
  textColor,
}: AnalyticsChartsProps) {
  return (
    <>
      <div className="chart-card" style={{ margin: 0 }}>
        <h3>{serviceLabel}</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={serviceDist} innerRadius={60} outerRadius={80} dataKey="value">
                {serviceDist.map((item, index) => (
                  <Cell key={`${item.name}-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: `1px solid ${gridColor}`, background: 'rgba(255,255,255,0.96)', color: '#10203d' }} />
              <Legend wrapperStyle={{ color: textColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card" style={{ margin: 0 }}>
        <h3>{incomeLabel}</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={incomeDist}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: `1px solid ${gridColor}`, background: 'rgba(255,255,255,0.96)', color: '#10203d' }} />
              <Bar dataKey="amount" fill={barColor} radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
