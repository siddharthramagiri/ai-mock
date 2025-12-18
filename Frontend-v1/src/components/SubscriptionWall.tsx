
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Check, 
  X, 
  Mail, 
  Star,
  Zap,
  Users,
  BarChart3
} from 'lucide-react';
import { User as UserData} from '@/auth/AuthContext';

interface SubscriptionWallProps {
  user: UserData;
  onClose: () => void;
}

const SubscriptionWall: React.FC<SubscriptionWallProps> = ({ user, onClose }) => {
  const handleContactDeveloper = () => {
    const subject = encodeURIComponent('Pro Subscription Request - AI Mock Interviewer');
    const body = encodeURIComponent(`Hello,

I would like to request Pro subscription access for my account:
- Name: ${user.name}
- Email: ${user.email}
- User ID: ${user.id}

Please let me know the next steps to activate Pro features.

Thank you!`);
    
    window.open(`mailto:sidduramagiri3@gmail.com?subject=${subject}&body=${body}`);
  };

  const handleUpgradeToPro = () => {
    // In real implementation, this would redirect to payment processor
    console.log('Redirecting to payment...');
    alert('Payment integration would be implemented here');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Upgrade to Pro</h1>
          <p className="text-xl text-gray-600">You've used all your free trials!</p>
          <p className="text-sm text-gray-500 mt-2">
            Hi {user.name}, you have {user.trials} trials remaining
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Free Plan */}
          <Card className="relative border-2">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-xl">Free Plan</CardTitle>
              </div>
              <div className="text-3xl font-bold text-gray-800">$0</div>
              <p className="text-gray-600">Perfect for trying out</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">2 mock interviews</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Basic resume parsing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Standard questions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-500">No detailed feedback</span>
                </div>
                <div className="flex items-center space-x-3">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-500">No interview history</span>
                </div>
              </div>
              <Badge variant="secondary" className="w-full text-center py-2">
                Current Plan
              </Badge>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                <Star className="w-4 h-4 mr-1" />
                Recommended
              </Badge>
            </div>
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-xl">Pro Plan</CardTitle>
              </div>
              <div className="text-3xl font-bold text-gray-800">$19</div>
              <p className="text-gray-600">per month</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Unlimited interviews</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Advanced resume analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Personalized questions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Detailed feedback & scoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Interview history & progress</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
              <Button 
                onClick={handleUpgradeToPro}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Alternative Options */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px bg-gray-300 flex-1" />
            <span className="text-gray-500 text-sm px-4">or</span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          <Card className="bg-gray-50">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">Contact Developer</h3>
              <a href="https://github.com/siddharthramagiri">
                <p className="text-sm text-gray-600 mb-4">Siddu Ramagiri</p>
              </a>
              <p className="text-sm text-gray-600 mb-4">
                Need help or have questions? Get in touch with our developer team.
              </p>
              <Button 
                onClick={handleContactDeveloper}
                variant="outline"
                className="border-gray-300"
              >
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={onClose}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionWall;
