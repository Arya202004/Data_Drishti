
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilePlus, Upload as UploadIcon, X, FileText, CheckCircle, AlertTriangle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadDataset, parseCSV } from "@/lib/dataUtils";

type ColumnAnalysis = {
  name: string;
  type: "number" | "string" | "date" | "boolean";
  missingValues: number;
  uniqueValues: number;
  visualizationSuggestion: "bar" | "line" | "pie" | "scatter" | "table";
}

type DataValidation = {
  hasMissingValues: boolean;
  hasDuplicates: boolean;
  missingValueCount: number;
  duplicateRowCount: number;
  validationMessages: string[];
}

const Upload = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [dataValidation, setDataValidation] = useState<DataValidation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload datasets",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate, toast]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload datasets",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (files.length > 0) {
      const selectedFile = files[0];
      
      // Check if file is CSV
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV file",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
      toast({
        title: "File selected",
        description: `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
      });

      // Start analyzing the file
      analyzeFile(selectedFile);
    }
  };

  const analyzeFile = async (file: File) => {
    setAnalyzing(true);
    setDataValidation(null);
    setColumnAnalysis([]);

    try {
      const result = await parseCSV(file);
      const { headers, data } = result as { headers: string[], data: Record<string, string>[] };
      
      // Analyze column types and suggest visualizations
      const analysis: ColumnAnalysis[] = [];
      const validation: DataValidation = {
        hasMissingValues: false,
        hasDuplicates: false,
        missingValueCount: 0,
        duplicateRowCount: 0,
        validationMessages: [],
      };

      // Check for duplicates
      const uniqueRows = new Set();
      let duplicateCount = 0;

      for (const row of data) {
        const rowStr = JSON.stringify(row);
        if (uniqueRows.has(rowStr)) {
          duplicateCount++;
        } else {
          uniqueRows.add(rowStr);
        }
      }

      validation.hasDuplicates = duplicateCount > 0;
      validation.duplicateRowCount = duplicateCount;
      
      if (duplicateCount > 0) {
        validation.validationMessages.push(`Found ${duplicateCount} duplicate rows in the dataset.`);
      }

      headers.forEach(header => {
        const values = data.map(row => row[header]);
        const nonEmptyValues = values.filter(v => v !== '' && v !== undefined && v !== null);
        const missingCount = values.length - nonEmptyValues.length;
        
        // Detect column type
        let type: "number" | "string" | "date" | "boolean" = "string";
        let visualizationSuggestion: "bar" | "line" | "pie" | "scatter" | "table" = "table";

        // Check if numbers
        const isNumber = nonEmptyValues.every(v => !isNaN(Number(v)));
        if (isNumber) {
          type = "number";
          visualizationSuggestion = nonEmptyValues.length > 10 ? "line" : "bar";
        } else {
          // Check if dates
          const isDate = nonEmptyValues.every(v => !isNaN(Date.parse(v)));
          if (isDate) {
            type = "date";
            visualizationSuggestion = "line";
          } else {
            // Check if boolean
            const isBoolean = nonEmptyValues.every(v => 
              v.toLowerCase() === "true" || 
              v.toLowerCase() === "false" || 
              v === "0" || 
              v === "1" || 
              v.toLowerCase() === "yes" || 
              v.toLowerCase() === "no"
            );
            
            if (isBoolean) {
              type = "boolean";
              visualizationSuggestion = "pie";
            } else {
              // If string with few unique values, suggest pie or bar
              const uniqueValues = new Set(nonEmptyValues).size;
              if (uniqueValues <= 10) {
                visualizationSuggestion = "pie";
              } else if (uniqueValues <= 30) {
                visualizationSuggestion = "bar";
              }
            }
          }
        }

        analysis.push({
          name: header,
          type,
          missingValues: missingCount,
          uniqueValues: new Set(nonEmptyValues).size,
          visualizationSuggestion
        });

        // Track missing values for validation
        if (missingCount > 0) {
          validation.hasMissingValues = true;
          validation.missingValueCount += missingCount;
        }
      });

      if (validation.missingValueCount > 0) {
        validation.validationMessages.push(`Found ${validation.missingValueCount} missing values across all columns.`);
      }

      setColumnAnalysis(analysis);
      setDataValidation(validation);
    } catch (error) {
      console.error("Error analyzing file:", error);
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the file",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setUploadComplete(false);
    setColumnAnalysis([]);
    setDataValidation(null);
  };

  const uploadFile = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setProgress(0);
    
    // Progress simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 90) {
          clearInterval(interval);
          return 90;
        }
        return newProgress;
      });
    }, 200);

    try {
      // Upload to Supabase
      const result = await uploadDataset(file, user.id);
      
      if (!result.success) {
        throw new Error(result.error as string);
      }

      // Finish progress and show success
      setProgress(100);
      setUploading(false);
      setUploadComplete(true);
      
      toast({
        title: "Upload complete",
        description: "Your dataset has been uploaded and analyzed. View it in your dashboard.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      setUploading(false);
    } finally {
      clearInterval(interval);
    }
  };

  // If user is not logged in, show authentication required message
  if (user === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-sm p-8 border border-border">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">
                You need to be logged in to upload datasets.
              </p>
              <Button onClick={() => navigate("/auth")}>
                Sign In / Register
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Upload Your Dataset</h1>
            <p className="text-muted-foreground">
              Supported format: CSV (Comma Separated Values)
            </p>
          </div>

          {!file ? (
            <div
              className={`relative flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg 
              ${dragging ? 'border-primary bg-primary/5' : 'border-border'} 
              transition-colors duration-200`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UploadIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Drag & Drop Your File Here</h3>
              <p className="text-muted-foreground text-sm mb-6">
                or choose a file from your computer
              </p>
              
              {/* Enhanced file selection button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="default" size="lg" className="relative overflow-hidden group">
                  <div className="flex items-center gap-2">
                    <FilePlus className="h-4 w-4" /> 
                    Select Files
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={handleFileInput}
                  />
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></span>
                </Button>
              </div>
              
              <div className="mt-6 text-xs text-muted-foreground">
                Maximum file size: 10MB
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow-sm p-8 border border-border animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{file.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {analyzing && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Analyzing file...</span>
                  </div>
                  <Progress value={50} />
                </div>
              )}

              {dataValidation && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Data Validation Results</h4>
                  
                  {dataValidation.validationMessages.length > 0 && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1">
                          {dataValidation.validationMessages.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {dataValidation.validationMessages.length === 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        No issues detected in your dataset. You're good to go!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {columnAnalysis.length > 0 && (
                <div className="mb-6 overflow-x-auto">
                  <h4 className="font-medium mb-2">Column Analysis</h4>
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Column</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Missing Values</th>
                        <th className="text-left py-2 px-2">Unique Values</th>
                        <th className="text-left py-2 px-2">Suggested Viz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnAnalysis.map((column, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2 px-2 font-medium">{column.name}</td>
                          <td className="py-2 px-2">{column.type}</td>
                          <td className="py-2 px-2">{column.missingValues}</td>
                          <td className="py-2 px-2">{column.uniqueValues}</td>
                          <td className="py-2 px-2">{column.visualizationSuggestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {uploading && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {uploadComplete ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Upload complete</span>
                  </div>
                  <Button variant="outline" onClick={removeFile}>
                    Upload Another File
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button 
                    onClick={uploadFile} 
                    disabled={uploading || analyzing}
                    className="gap-2"
                  >
                    <UploadIcon className="h-4 w-4" /> 
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 bg-muted rounded-xl p-6">
            <h3 className="font-medium mb-3">Tips for uploading datasets</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Make sure your CSV file has headers in the first row</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Clean your data from any inconsistencies before uploading</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>For best results, ensure your data types are consistent within each column</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Maximum file size: 10MB</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Upload;
