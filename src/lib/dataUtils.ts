
import { supabase } from '@/lib/supabase';

// Function to upload CSV file to Supabase storage
export async function uploadDataset(file: File, userId: string) {
  try {
    // Upload the file to storage
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('datasets')
      .getPublicUrl(fileName);

    // Store metadata in database
    const { error: dbError } = await supabase
      .from('datasets')
      .insert({
        user_id: userId,
        name: file.name,
        file_path: fileName,
        storage_path: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || 'text/csv',
      });

    if (dbError) {
      throw dbError;
    }

    return { success: true, path: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading dataset:', error);
    return { success: false, error };
  }
}

// Function to fetch user's datasets
export async function getUserDatasets(userId: string) {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return { success: false, error };
  }
}

// Function to delete a dataset
export async function deleteDataset(datasetId: string, userId: string) {
  try {
    // First get the dataset to get the file path
    const { data, error: fetchError } = await supabase
      .from('datasets')
      .select('file_path')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!data) {
      throw new Error('Dataset not found or you do not have permission to delete it');
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('datasets')
      .remove([data.file_path]);

    if (storageError) {
      throw storageError;
    }

    // Delete the database entry
    const { error: dbError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId)
      .eq('user_id', userId);

    if (dbError) {
      throw dbError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return { success: false, error };
  }
}

// Parse CSV file content
export async function parseCSV(file: File): Promise<{ headers: string[], data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      
      const csvContent = event.target.result;
      const lines = csvContent.split('\n');
      
      if (lines.length === 0) {
        reject(new Error('CSV file is empty'));
        return;
      }

      // Extract headers (first line)
      const headers = lines[0].split(',').map(header => header.trim());
      
      // Process data rows
      const data: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        // Handle potential commas within quoted fields
        let row: string[] = [];
        let insideQuotes = false;
        let currentValue = '';
        let j = 0;
        
        while (j < lines[i].length) {
          const char = lines[i][j];
          
          if (char === '"' && (j === 0 || lines[i][j-1] !== '\\')) {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            row.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
          
          j++;
        }
        
        // Add the last value
        row.push(currentValue.trim());
        
        // If simple split would work better for this row, use it
        if (row.length !== headers.length) {
          row = lines[i].split(',').map(value => value.trim());
        }
        
        // Create object from headers and values
        const rowObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObj[header] = index < row.length ? row[index] : '';
        });
        
        data.push(rowObj);
      }
      
      resolve({ headers, data });
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Analyze CSV data to determine column types and statistics
export function analyzeCSVData(headers: string[], data: Record<string, string>[]) {
  const analysis = headers.map(header => {
    const values = data.map(row => row[header]);
    const nonEmptyValues = values.filter(v => v !== '' && v !== undefined && v !== null);
    
    // Check for types
    const isNumber = nonEmptyValues.every(v => !isNaN(Number(v)));
    const isDate = nonEmptyValues.every(v => !isNaN(Date.parse(v)));
    const isBoolean = nonEmptyValues.every(v => 
      v.toLowerCase() === 'true' || 
      v.toLowerCase() === 'false' || 
      v === '0' || 
      v === '1'
    );
    
    let type = 'string';
    if (isNumber) type = 'number';
    else if (isDate) type = 'date';
    else if (isBoolean) type = 'boolean';
    
    // Calculate statistics
    const uniqueValues = new Set(nonEmptyValues).size;
    const missingValues = values.length - nonEmptyValues.length;
    const missingPercentage = (missingValues / values.length) * 100;
    
    // Determine best visualization
    let visualization = 'table';
    if (type === 'number') {
      visualization = uniqueValues > 10 ? 'line' : 'bar';
    } else if (type === 'date') {
      visualization = 'line';
    } else if (uniqueValues <= 10) {
      visualization = 'pie';
    } else if (uniqueValues <= 25) {
      visualization = 'bar';
    }
    
    return {
      column: header,
      type,
      uniqueValues,
      missingValues,
      missingPercentage,
      recommendedVisualization: visualization
    };
  });
  
  return analysis;
}
