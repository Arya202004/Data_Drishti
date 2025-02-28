
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  BarChart, 
  LineChart,
  ScatterChart,
  ResponsiveContainer,
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Scatter,
  Cell,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap
} from "recharts";
import { getUserDatasets, parseCSV } from "@/lib/dataUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  BarChart2, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  RefreshCw,
  Calendar, 
  Table, 
  Trash2, 
  Eye,
  Upload,
  AlertTriangle,
  Network,
  Grid,
  BoxSelect,
  Sigma,
  Radar as RadarIcon
} from "lucide-react";

type Dataset = {
  id: string;
  name: string;
  file_path: string;
  storage_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

type DashboardCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
}

type DataSummary = {
  totalRows: number;
  totalColumns: number;
  validRows: number;
  hasNulls: boolean;
  nullPercentage: number;
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'treemap' | 'heatmap' | 'boxplot';

const COLORS = [
  'hsl(var(--primary))', 
  '#10b981', 
  '#f97316', 
  '#8b5cf6', 
  '#ec4899', 
  '#14b8a6', 
  '#f43f5e'
];

const DashboardCard = ({ title, description, icon, value, change }: DashboardCardProps) => (
  <Card className="card-hover">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mr-2">
          {icon}
        </div>
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {change && (
        <p className="text-sm text-muted-foreground mt-1">
          <span className={change.positive ? "text-green-500" : "text-red-500"}>
            {change.positive ? "↑" : "↓"} {change.value}
          </span>{" "}
          from last month
        </p>
      )}
    </CardContent>
  </Card>
);

// Create box plot data from an array of numbers
const prepareBoxPlotData = (values: number[]) => {
  values.sort((a, b) => a - b);
  const min = values[0];
  const max = values[values.length - 1];
  const q1Index = Math.floor(values.length / 4);
  const q3Index = Math.floor(values.length * 3 / 4);
  const medianIndex = Math.floor(values.length / 2);
  
  const q1 = values[q1Index];
  const q3 = values[q3Index];
  const median = values[medianIndex];
  
  // Create a structure for visualization
  return [
    { name: 'Min', value: min },
    { name: 'Q1', value: q1 },
    { name: 'Median', value: median },
    { name: 'Q3', value: q3 },
    { name: 'Max', value: max }
  ];
};

// Generate a correlation matrix for heatmap visualization
const generateCorrelationData = (data: Record<string, string>[], numericColumns: string[]) => {
  // Convert string values to numbers and calculate correlations
  const numericData = data.map(row => {
    const result: Record<string, number> = {};
    numericColumns.forEach(col => {
      result[col] = Number(row[col]) || 0;
    });
    return result;
  });
  
  const correlationData: {name: string, correlations: {x: string, y: string, value: number}[]}[] = [];
  
  // Calculate correlation between each pair of columns
  numericColumns.forEach(col1 => {
    const rowData: {x: string, y: string, value: number}[] = [];
    
    numericColumns.forEach(col2 => {
      const values1 = numericData.map(row => row[col1]);
      const values2 = numericData.map(row => row[col2]);
      
      // Calculate correlation
      const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
      const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
      
      let numerator = 0;
      let denom1 = 0;
      let denom2 = 0;
      
      for (let i = 0; i < values1.length; i++) {
        const diff1 = values1[i] - mean1;
        const diff2 = values2[i] - mean2;
        
        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
      }
      
      const correlation = denom1 === 0 || denom2 === 0 ? 
        0 : 
        numerator / (Math.sqrt(denom1) * Math.sqrt(denom2));
      
      rowData.push({ x: col2, y: col1, value: correlation });
    });
    
    correlationData.push({ name: col1, correlations: rowData });
  });
  
  return correlationData;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      toast({
        title: "Authentication required",
        description: "Please sign in to view your dashboard",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate]);

  // Load user's datasets
  useEffect(() => {
    if (!user) return;
    
    const loadDatasets = async () => {
      setLoading(true);
      try {
        const result = await getUserDatasets(user.id);
        if (result.success && result.data) {
          setDatasets(result.data as Dataset[]);
          
          // Set first dataset as active if available
          if (result.data.length > 0 && !activeDataset) {
            setActiveDataset(result.data[0].id);
            await loadDatasetContent(result.data[0]);
          }
        } else {
          throw new Error("Failed to load datasets");
        }
      } catch (error) {
        console.error("Error loading datasets:", error);
        toast({
          title: "Error",
          description: "Failed to load your datasets",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDatasets();
  }, [user]);

  // Load dataset content when active dataset changes
  useEffect(() => {
    if (!activeDataset) return;
    
    const dataset = datasets.find(d => d.id === activeDataset);
    if (dataset) {
      loadDatasetContent(dataset);
    }
  }, [activeDataset]);

  // Update box plot data when active column changes
  useEffect(() => {
    if (selectedColumn && numericColumns.includes(selectedColumn) && rawData.length > 0) {
      const values = rawData
        .map(row => Number(row[selectedColumn]))
        .filter(value => !isNaN(value));
      
      if (values.length > 0) {
        setBoxPlotData(prepareBoxPlotData(values));
      }
    }
  }, [selectedColumn, rawData, numericColumns]);

  const loadDatasetContent = async (dataset: Dataset) => {
    try {
      const { data, error } = await supabase.storage
        .from('datasets')
        .download(dataset.file_path);
      
      if (error) {
        throw error;
      }

      if (data) {
        const result = await parseCSV(new File([data], dataset.name, { type: 'text/csv' }));
        const { headers, data: parsedData } = result as { headers: string[], data: Record<string, string>[] };
        
        // Save raw data and headers
        setRawData(parsedData);
        setHeaders(headers);
        
        // Generate chart data
        const numeric = generateNumericColumns(headers, parsedData);
        setNumericColumns(numeric);
        
        // Generate regular chart data
        generateChartData(headers, parsedData, numeric);
        
        // Generate heatmap data if there are at least 2 numeric columns
        if (numeric.length >= 2) {
          setHeatmapData(generateCorrelationData(parsedData, numeric));
          
          // Set first numeric column as selected for box plot
          if (numeric.length > 0) {
            setSelectedColumn(numeric[0]);
          }
        }
        
        // Generate data summary
        generateDataSummary(headers, parsedData);
      }
    } catch (error) {
      console.error("Error loading dataset content:", error);
      toast({
        title: "Error",
        description: "Failed to load dataset content",
        variant: "destructive",
      });
    }
  };

  const generateNumericColumns = (headers: string[], data: Record<string, string>[]) => {
    return headers.filter(header => {
      return data.some(row => {
        const value = row[header];
        return value && !isNaN(Number(value));
      });
    });
  };

  const generateChartData = (headers: string[], data: Record<string, string>[], numericCols: string[]) => {
    // Find a suitable category column
    let categoryColumn = headers.find(header => {
      const uniqueValues = new Set(data.map(row => row[header])).size;
      return uniqueValues > 1 && uniqueValues <= 15; // Reasonable number of categories
    });

    // If no suitable category column, use the first column
    if (!categoryColumn && headers.length > 0) {
      categoryColumn = headers[0];
    }

    // Generate chart data
    if (categoryColumn && numericCols.length > 0) {
      const chartData = data.slice(0, 20).map(row => {
        const result: Record<string, any> = {
          name: row[categoryColumn as string] || 'Unknown'
        };
        
        numericCols.forEach(col => {
          result[col] = Number(row[col]) || 0;
        });
        
        return result;
      });
      
      setChartData(chartData);
    } else {
      // Fallback if no suitable columns found
      setChartData([]);
    }
  };

  const generateDataSummary = (headers: string[], data: Record<string, string>[]) => {
    if (!data.length) return;

    let nullCount = 0;
    let totalValues = headers.length * data.length;

    // Count null values
    data.forEach(row => {
      headers.forEach(header => {
        if (row[header] === undefined || row[header] === null || row[header] === '') {
          nullCount++;
        }
      });
    });

    setDataSummary({
      totalRows: data.length,
      totalColumns: headers.length,
      validRows: data.filter(row => 
        headers.every(header => row[header] !== undefined && row[header] !== null && row[header] !== '')
      ).length,
      hasNulls: nullCount > 0,
      nullPercentage: totalValues > 0 ? (nullCount / totalValues) * 100 : 0
    });
  };

  const refreshData = () => {
    setIsRefreshing(true);
    
    if (activeDataset) {
      const dataset = datasets.find(d => d.id === activeDataset);
      if (dataset) {
        loadDatasetContent(dataset);
      }
    }
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const deleteDataset = async (datasetId: string) => {
    if (!user) return;
    
    try {
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) throw new Error("Dataset not found");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('datasets')
        .remove([dataset.file_path]);
      
      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId);
      
      if (dbError) throw dbError;

      // Update state
      setDatasets(prev => prev.filter(d => d.id !== datasetId));
      
      // If deleting active dataset, set new active
      if (activeDataset === datasetId) {
        const newActive = datasets.find(d => d.id !== datasetId);
        if (newActive) {
          setActiveDataset(newActive.id);
          loadDatasetContent(newActive);
        } else {
          setActiveDataset(null);
          setChartData([]);
          setDataSummary(null);
        }
      }

      toast({
        title: "Dataset deleted",
        description: "The dataset has been successfully deleted",
      });
    } catch (error) {
      console.error("Error deleting dataset:", error);
      toast({
        title: "Error",
        description: "Failed to delete dataset",
        variant: "destructive",
      });
    }
  };

  // If user is not logged in, show authentication required
  if (user === null) {
    return null; // useEffect will redirect to login
  }

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-16">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p>Not enough data to generate this visualization.</p>
          <p className="text-sm">Try selecting a different chart type or dataset.</p>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(chartData[0] || {})
                .filter(key => key !== 'name')
                .slice(0, 3)
                .map((key, index) => (
                  <Bar 
                    key={index} 
                    dataKey={key} 
                    fill={COLORS[index % COLORS.length]} 
                    name={key}
                    radius={[4, 4, 0, 0]} 
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(chartData[0] || {})
                .filter(key => key !== 'name')
                .slice(0, 3)
                .map((key, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    activeDot={{ r: 8 }}
                    name={key}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        // Extract the first numeric column and use it for pie chart values
        const pieDataKey = Object.keys(chartData[0] || {}).filter(key => key !== 'name')[0];
        if (!pieDataKey) return null;
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={130}
                dataKey={pieDataKey}
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        // Need at least two numeric columns for scatter plot
        if (numericColumns.length < 2) {
          return (
            <div className="text-center text-muted-foreground py-16">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Scatter plots require at least two numeric columns.</p>
              <p className="text-sm">Try selecting a different chart type or dataset.</p>
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                type="number" 
                dataKey={numericColumns[0]} 
                name={numericColumns[0]} 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                type="number" 
                dataKey={numericColumns[1]} 
                name={numericColumns[1]} 
                tick={{ fontSize: 12 }} 
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter 
                name={`${numericColumns[0]} vs ${numericColumns[1]}`} 
                data={chartData} 
                fill={COLORS[0]} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      case 'radar':
        // Extract the numeric columns for radar plot
        const radarColumns = Object.keys(chartData[0] || {})
          .filter(key => key !== 'name')
          .slice(0, 5); // Limit to 5 dimensions for radar
        
        if (radarColumns.length < 3) {
          return (
            <div className="text-center text-muted-foreground py-16">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Radar charts work best with at least 3 dimensions.</p>
              <p className="text-sm">Try selecting a different chart type or dataset.</p>
            </div>
          );
        }
        
        // Take only a subset of the data for clarity
        const radarData = chartData.slice(0, 5);
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              {radarColumns.map((key, index) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                  data={radarData}
                />
              ))}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );
      
      case 'treemap':
        // Need a numeric column for treemap size
        const treemapDataKey = numericColumns[0];
        if (!treemapDataKey) {
          return (
            <div className="text-center text-muted-foreground py-16">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Treemaps require at least one numeric column.</p>
              <p className="text-sm">Try selecting a different chart type or dataset.</p>
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={chartData}
              dataKey={treemapDataKey}
              nameKey="name"
              aspectRatio={4/3}
              content={({ root, depth, x, y, width, height, index, name, value }) => {
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{
                        fill: COLORS[index % COLORS.length],
                        stroke: '#fff',
                        strokeWidth: 2 / (depth + 1e-10),
                        strokeOpacity: 1 / (depth + 1e-10),
                      }}
                    />
                    {(width > 50 && height > 30) ? (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 12,
                          fill: '#fff',
                          pointerEvents: 'none'
                        }}
                      >
                        {name}: {value}
                      </text>
                    ) : null}
                  </g>
                );
              }}
            />
          </ResponsiveContainer>
        );
      
      case 'boxplot':
        // Need numeric data for box plot
        if (!selectedColumn || boxPlotData.length === 0) {
          return (
            <div className="text-center text-muted-foreground py-16">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Box plots require a numeric column selection.</p>
              <p className="text-sm">Select a numeric column from the dropdown above.</p>
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={boxPlotData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              layout="vertical"
              barSize={30}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 12 }} 
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Bar 
                dataKey="value" 
                fill={COLORS[0]} 
                name={selectedColumn} 
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'heatmap':
        // Need at least two numeric columns for heatmap
        if (numericColumns.length < 2 || heatmapData.length === 0) {
          return (
            <div className="text-center text-muted-foreground py-16">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p>Heatmaps require at least two numeric columns.</p>
              <p className="text-sm">Try selecting a different chart type or dataset.</p>
            </div>
          );
        }
        
        // Visualize the first correlation row
        const correlationRow = heatmapData[0];
        
        return (
          <div className="p-4 text-center overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Correlation Heatmap</h3>
            <div className="inline-block">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Variables</th>
                    {numericColumns.map(col => (
                      <th key={col} className="p-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => (
                    <tr key={row.name}>
                      <td className="p-2 font-medium">{row.name}</td>
                      {row.correlations.map((cell, j) => {
                        // Calculate heatmap color
                        // Value ranges from -1 to 1
                        const value = cell.value;
                        let color;
                        
                        if (value > 0) {
                          // Blue shades for positive correlation
                          const intensity = Math.round(value * 255);
                          color = `rgba(0, 0, 255, ${value})`;
                        } else {
                          // Red shades for negative correlation
                          const intensity = Math.round(-value * 255);
                          color = `rgba(255, 0, 0, ${-value})`;
                        }
                        
                        return (
                          <td 
                            key={`${i}-${j}`} 
                            className="p-2 border text-xs"
                            style={{ 
                              background: color,
                              color: Math.abs(value) > 0.5 ? '#fff' : '#000'
                            }}
                          >
                            {value.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Values closer to 1 indicate strong positive correlation, values closer to -1 indicate strong negative correlation.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Data Dashboard</h1>
            <p className="text-muted-foreground">
              Interactive visualizations for your datasets
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {datasets.length > 0 ? (
              <Select 
                value={activeDataset || undefined} 
                onValueChange={val => setActiveDataset(val)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshData}
              disabled={isRefreshing || !activeDataset}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {datasets.length === 0 && !loading ? (
          <div className="bg-card rounded-xl shadow-sm p-8 border border-border text-center">
            <div className="flex flex-col items-center">
              <Upload className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Datasets Found</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Upload your first dataset to start analyzing and visualizing your data.
              </p>
              <Button onClick={() => navigate("/upload")}>
                Upload Dataset
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="mb-8"
            >
              <TabsList className="grid grid-cols-4 max-w-md mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="visualize">Visualize</TabsTrigger>
                <TabsTrigger value="uploads">Upload History</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/* Overview Cards */}
                {dataSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <DashboardCard 
                      title="Total Rows" 
                      description="Number of records in dataset"
                      icon={<Table className="h-4 w-4 text-primary" />}
                      value={dataSummary.totalRows}
                    />
                    
                    <DashboardCard 
                      title="Data Completeness" 
                      description="Percentage of complete rows"
                      icon={<BarChart2 className="h-4 w-4 text-primary" />}
                      value={`${((dataSummary.validRows / dataSummary.totalRows) * 100).toFixed(1)}%`}
                    />
                    
                    <DashboardCard 
                      title="Missing Values" 
                      description="Percentage of null values"
                      icon={<AlertTriangle className="h-4 w-4 text-primary" />}
                      value={`${dataSummary.nullPercentage.toFixed(1)}%`}
                    />
                  </div>
                )}

                {/* Charts */}
                {chartData.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Card className="card-hover overflow-hidden">
                      <CardHeader>
                        <CardTitle>Data Distribution</CardTitle>
                        <CardDescription>Visualization of your dataset values</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar 
                                dataKey={Object.keys(chartData[0] || {}).filter(k => k !== 'name')[0]} 
                                fill="hsl(var(--primary))" 
                                name="Value" 
                                radius={[4, 4, 0, 0]} 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-hover overflow-hidden">
                      <CardHeader>
                        <CardTitle>Trend Analysis</CardTitle>
                        <CardDescription>Patterns and trends in your data</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {Object.keys(chartData[0] || {})
                                .filter(key => key !== 'name')
                                .slice(0, 3) // Limit to 3 lines for better visibility
                                .map((key, index) => (
                                  <Line
                                    key={index}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={index === 0 ? "hsl(var(--primary))" : index === 1 ? "#10b981" : "hsl(var(--destructive))"}
                                    activeDot={{ r: 8 }}
                                    name={key}
                                  />
                                ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="mb-8">
                    <CardContent className="py-6">
                      <div className="text-center text-muted-foreground">
                        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                        <p>Could not generate visualizations from this dataset.</p>
                        <p className="text-sm">The dataset may not contain suitable numerical data for charts.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Data Source Info */}
                {activeDataset && (
                  <Card className="card-hover mb-8">
                    <CardHeader>
                      <CardTitle>Dataset Information</CardTitle>
                      <CardDescription>Details about the current dataset</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(() => {
                          const dataset = datasets.find(d => d.id === activeDataset);
                          if (!dataset) return null;
                          
                          return (
                            <>
                              <div>
                                <h4 className="text-sm font-medium mb-1">Dataset Name</h4>
                                <p className="text-sm text-muted-foreground">{dataset.name}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(dataset.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-1">File Size</h4>
                                <p className="text-sm text-muted-foreground">
                                  {dataset.file_size < 1024 
                                    ? `${dataset.file_size} bytes` 
                                    : dataset.file_size < 1048576 
                                      ? `${(dataset.file_size / 1024).toFixed(1)} KB`
                                      : `${(dataset.file_size / 1048576).toFixed(1)} MB`}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-1">Data Points</h4>
                                <p className="text-sm text-muted-foreground">
                                  {dataSummary ? `${dataSummary.totalRows} rows, ${dataSummary.totalColumns} columns` : 'Loading...'}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="visualize">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl font-semibold">Interactive Visualization</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select 
                      value={chartType} 
                      onValueChange={(val) => setChartType(val as ChartType)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Chart Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">
                          <div className="flex items-center">
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Bar Chart
                          </div>
                        </SelectItem>
                        <SelectItem value="line">
                          <div className="flex items-center">
                            <LineIcon className="mr-2 h-4 w-4" />
                            Line Chart
                          </div>
                        </SelectItem>
                        <SelectItem value="pie">
                          <div className="flex items-center">
                            <PieIcon className="mr-2 h-4 w-4" />
                            Pie Chart
                          </div>
                        </SelectItem>
                        <SelectItem value="scatter">
                          <div className="flex items-center">
                            <Sigma className="mr-2 h-4 w-4" />
                            Scatter Plot
                          </div>
                        </SelectItem>
                        <SelectItem value="radar">
                          <div className="flex items-center">
                            <RadarIcon className="mr-2 h-4 w-4" />
                            Radar Chart
                          </div>
                        </SelectItem>
                        <SelectItem value="treemap">
                          <div className="flex items-center">
                            <Grid className="mr-2 h-4 w-4" />
                            Tree Map
                          </div>
                        </SelectItem>
                        <SelectItem value="heatmap">
                          <div className="flex items-center">
                            <Network className="mr-2 h-4 w-4" />
                            Heatmap
                          </div>
                        </SelectItem>
                        <SelectItem value="boxplot">
                          <div className="flex items-center">
                            <BoxSelect className="mr-2 h-4 w-4" />
                            Box Plot
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {chartType === 'boxplot' && numericColumns.length > 0 && (
                      <Select 
                        value={selectedColumn} 
                        onValueChange={setSelectedColumn}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericColumns.map(col => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                <Card className="mb-8 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="h-[500px]">
                      {renderChart()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="uploads">
                <h2 className="text-xl font-semibold mb-4">Upload History</h2>
                
                {datasets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {datasets.map(dataset => (
                      <Card key={dataset.id} className="overflow-hidden transition-all hover:shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg truncate">{dataset.name}</CardTitle>
                          <CardDescription>
                            Uploaded {new Date(dataset.created_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center mb-1">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{new Date(dataset.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Table className="h-4 w-4 mr-2" />
                              <span>
                                {dataset.file_size < 1024 
                                  ? `${dataset.file_size} bytes` 
                                  : dataset.file_size < 1048576 
                                    ? `${(dataset.file_size / 1024).toFixed(1)} KB`
                                    : `${(dataset.file_size / 1048576).toFixed(1)} MB`}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActiveDataset(dataset.id)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteDataset(dataset.id)}
                            className="text-destructive hover:text-destructive gap-1"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="mb-8">
                    <CardContent className="py-6">
                      <div className="text-center text-muted-foreground">
                        <Upload className="mx-auto h-8 w-8 mb-2" />
                        <p>No upload history found.</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate("/upload")}
                        >
                          Upload Your First Dataset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard Settings</CardTitle>
                    <CardDescription>Configure your dashboard preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Account Information</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">Email:</span> {user?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">User ID:</span> {user?.id}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Dataset Statistics</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">Total Datasets:</span> {datasets.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Total Storage:</span> {
                            datasets.reduce((acc, dataset) => acc + dataset.file_size, 0) < 1048576
                              ? `${(datasets.reduce((acc, dataset) => acc + dataset.file_size, 0) / 1024).toFixed(1)} KB`
                              : `${(datasets.reduce((acc, dataset) => acc + dataset.file_size, 0) / 1048576).toFixed(1)} MB`
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
