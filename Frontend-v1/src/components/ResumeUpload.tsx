
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/AuthContext'; // make sure this is imported
import API_URL from '@/api';

export interface ResumeData {
  candidate_name: string;
  location: string;
  contact_details: string[];
  links: string[];
  career_objective: string;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    duration: string;
    location: string;
  }>;
  work_experience: any[];
  internships: any[];
  projects: Array<{
    title: string;
    description: string;
  }>;
  certifications: string[];
  achievements: string[];
}

interface ResumeUploadProps {
  onResumeUpload: (data: ResumeData) => void;
}  
  
const ResumeUpload: React.FC<ResumeUploadProps> = ({ onResumeUpload }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = async (file: File) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please login before uploading resume.",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/resume/upload/${user.id}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) throw new Error("Failed to parse resume");

      const parsedResume = await res.json();
      onResumeUpload(parsedResume);
      setUploadStatus('success');

      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been parsed and is ready for the interview.",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      setUploadStatus('error');
      toast({
        title: "Upload failed",
        description: "There was an error processing your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const getStatusIcon = () => {
    if (isUploading) return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
    if (uploadStatus === 'success') return <CheckCircle className="w-8 h-8 text-green-600" />;
    if (uploadStatus === 'error') return <AlertCircle className="w-8 h-8 text-red-600" />;
    return <Upload className="w-8 h-8 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isUploading) return "Processing your resume...";
    if (uploadStatus === 'success') return `Successfully uploaded: ${uploadedFile?.name}`;
    if (uploadStatus === 'error') return "Upload failed. Please try again.";
    return "Upload your resume to get started";
  };

  return (
    <div className="w-full">
      <Card
        className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : uploadStatus === 'success'
            ? 'border-green-500 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            {getStatusIcon()}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {uploadStatus === 'idle' ? 'Upload Resume' : 'Resume Status'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {getStatusText()}
              </p>
            </div>

            {uploadStatus === 'idle' && (
              <>
                <div className="text-sm text-gray-500">
                  Drag and drop your PDF resume here, or click to browse
                </div>
                
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="resume-upload"
                  disabled={isUploading}
                />
                
                <Button
                  onClick={() => document.getElementById('resume-upload')?.click()}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}

            {uploadStatus === 'success' && uploadedFile && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {uploadedFile.name}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    setUploadStatus('idle');
                    setUploadedFile(null);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Upload Different File
                </Button>
              </div>
            )}

            {uploadStatus === 'error' && (
              <Button
                onClick={() => setUploadStatus('idle')}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Try Again
              </Button>
            )}

            <div className="text-xs text-gray-400">
              Supported format: PDF • Max size: 10MB
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeUpload;
