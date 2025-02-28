
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserDatasets } from "@/lib/dataUtils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, 
  Trash2, 
  Eye, 
  Upload, 
  ChevronRight, 
  FileText, 
  RefreshCw,
  Shield
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

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      toast({
        title: "Authentication required",
        description: "Please sign in to view your upload history",
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

  const deleteDataset = async (datasetId: string) => {
    if (!user) return;
    
    setIsDeleting(datasetId);
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
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // If user is not logged in, show authentication required
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
                You need to be logged in to view your upload history.
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
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Upload History</h1>
              <p className="text-muted-foreground">
                Manage your uploaded datasets
              </p>
            </div>
            
            <Button onClick={() => navigate("/upload")} className="gap-2">
              <Upload className="h-4 w-4" /> Upload New Dataset
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : datasets.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="flex flex-col items-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">No Datasets Found</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't uploaded any datasets yet. Upload your first dataset to get started.
                  </p>
                  <Button onClick={() => navigate("/upload")}>
                    Upload Your First Dataset
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {datasets.map(dataset => (
                <Card key={dataset.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{dataset.name}</CardTitle>
                        <CardDescription>
                          Uploaded on {formatDate(dataset.created_at)} at {formatTime(dataset.created_at)}
                        </CardDescription>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">File Size</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatFileSize(dataset.file_size)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">File Type</div>
                        <div className="text-sm text-muted-foreground">
                          {dataset.file_type || 'CSV file'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Dataset ID</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {dataset.id}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/dashboard?dataset=${dataset.id}`)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" /> View Dashboard
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      onClick={() => deleteDataset(dataset.id)}
                      disabled={isDeleting === dataset.id}
                      className="gap-1"
                    >
                      {isDeleting === dataset.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete Dataset
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {datasets.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-1">
                Go to Dashboard <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;
