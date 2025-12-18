import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResumeUpload from '@/components/ResumeUpload';
import InterviewSession from '@/components/InterviewSession';
import SubscriptionWall from '@/components/SubscriptionWall';
import { User, FileText, Mic, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { User as UserData} from '@/auth/AuthContext';
import axios from 'axios';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import API_URL from '@/api';
import { ResumeData } from '@/components/ResumeUpload';


const Home = () => {
  const { logout, user : currUser, isLoading } = useAuth();
  const [user, setUser] = useState<UserData>()
  const [company, setCompany] = useState<string>("");
  const [jobRole, setJobRole] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [showSubscriptionWall, setShowSubscriptionWall] = useState(false);
  const [interviewSessionKey, setInterviewSessionKey] = useState(0);
  const navigate = useNavigate();

  // Mock authentication - in real app, this would connect to your OAuth2 backend
  useEffect(() => {
  if (!isLoading) {
      if (!currUser) {
        navigate('/login');
      } else {
        setUser(currUser);
        const resume = currUser.resume;
        const raw = resume?.resume_json;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            setResumeData(parsed);
          } catch (e) {
            console.error('Invalid resume JSON:', e);
          }
        } else {
          console.log("JSON FORMAT :::: ",raw);
          setResumeData(raw);
        }
      }
    }
  }, [isLoading, currUser]);

  const handleLogout = async () => {
    await logout();
  };

  const handleResumeUpload = (data: ResumeData) => {
    setResumeData(data);
  };

  const handleStartInterview = () => {
    if (!user) return;
    
    if (user.trials === 0 && !user.pro) {
      setShowSubscriptionWall(true);
      return;
    }
    
    setInterviewSessionKey(prev => prev + 1); // increment key for new session
    setIsInterviewActive(true);
  };

  const handleEndInterview = () => {
    setIsInterviewActive(false);
    // Update trials count
    if (user && !user.pro) {
      setUser({ ...user, trials: user.trials - 1 });
    }
  };

  if (showSubscriptionWall) {
    return <SubscriptionWall user={user} onClose={() => setShowSubscriptionWall(false)} />;
  }

  if (isInterviewActive) {
    return (
      <InterviewSession 
        key={interviewSessionKey}
        resumeData={resumeData} 
        company={company}
        jobRole={jobRole}
        user={user}
        startInterviewNow={true} 
        onEnd={handleEndInterview} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br bg-gray-50">
      {/* Header */}
      <header className="bg-gray-200 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">AI Mock Interviewer</h1>
            </div>
            {
              user? 
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  {user.pro ? (
                    <Badge className="bg-yellow-100 text-yellow-800">Pro</Badge>
                  ) : (
                    <Badge variant="outline">{user.trials} trials left</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
              :
              <>
              </>
            }
          </div>
        </div>
      </header>

      {/* <Button onClick={() => getResume()}>Get Resume</Button> */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resume Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span>Upload Resume</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResumeUpload onResumeUpload={handleResumeUpload} />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className='m-3 grid gap-5'>
                  <Label className='mt-5'>Company Name :</Label>
                  <Input type='text' value={company} onChange={(e) => setCompany(e.target.value)}/>
                  <Label className='mt-5'>Job Role :</Label>
                  <Input type='text' value={jobRole} onChange={(e) => setJobRole(e.target.value)}/>
                </div>
              </CardContent>
            </Card>

            {/* Interview Action */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleStartInterview}
                  disabled={!resumeData}
                  className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  {resumeData ? 'Take Interview' : 'Upload Resume First'}
                </Button>
                {user?.trials === 0 && !user?.pro && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    No trials remaining. Upgrade to Pro to continue.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resume Preview Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resume Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {resumeData ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{resumeData.candidate_name || 'Unknown Candidate'}</h3>
                      <p className="text-gray-600">{resumeData.location}</p>
                      {resumeData?.contact_details?.length > 0 &&
                        <div>
                          {resumeData.contact_details.map((contact, home) => (
                            <p className="text-gray-500 text-xs" key={home}>{contact}</p>
                          ))}
                        </div>
                      }

                    </div>
                    
                    {resumeData?.career_objective && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Career Objective</h4>
                        <p className="text-sm text-gray-600">{resumeData.career_objective}</p>
                      </div>
                    )}

                    {resumeData?.skills?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {resumeData.skills.map((skill, home) => (
                            <Badge key={home} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {resumeData?.skills?.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{resumeData?.skills?.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {resumeData?.education?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Education</h4>
                        {resumeData.education.map((edu, home) => (
                          <div key={home} className="text-sm text-gray-600 mb-1">
                            <p className="font-medium">{edu.degree}</p>
                            <p>{edu.institution} • {edu.duration}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {resumeData?.projects?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Projects</h4>
                        {resumeData.projects.map((project, home) => (
                          <div key={home} className="text-sm text-gray-600 mb-2">
                            <p className="font-medium">{project.title}</p>
                            <p className="text-xs">{project.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {resumeData?.achievements?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Achievements</h4>
                        <div className="flex flex-wrap gap-1">
                          {resumeData.achievements.map((achievement, home) => (
                            <Badge key={home} variant="secondary" className="text-xs">
                              {achievement}
                            </Badge>
                          ))}
                          {resumeData?.achievements?.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{resumeData?.achievements?.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {resumeData?.certifications?.length > 0 && (
                      <div>
                        <h4 className='font-medium text-sm text-gray-700 mb-2'>Certifications</h4>
                        {resumeData.certifications.map((certificate, home) => (
                          <div key={home} className='text-sm text-gray-600 mb-2'>
                            <p className="text-xs">{certificate}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Upload your resume to see the summary here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
