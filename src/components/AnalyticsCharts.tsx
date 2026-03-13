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
  colors: string[];
  incomeDist: IncomeDistributionItem[];
  incomeLabel: string;
  serviceDist: ServiceDistributionItem[];
  serviceLabel: string;
};

export default function AnalyticsCharts({
  colors,
  incomeDist,
  incomeLabel,
  serviceDist,
  serviceLabel,
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card" style={{ margin: 0 }}>
        <h3>{incomeLabel}</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={incomeDist}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
