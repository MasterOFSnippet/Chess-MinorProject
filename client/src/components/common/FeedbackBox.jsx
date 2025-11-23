/**
 * FeedbackBox Component
 * Allows users to submit bug reports and feedback
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MessageSquare, Send, CheckCircle, AlertCircle, Bug, Lightbulb, TrendingUp, HelpCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FeedbackBox = ({ user }) => {
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: '',
    email: user?.email || ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'improvement', label: 'Improvement', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-gray-500' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      setStatus('error');
      setMessage('Please fill in all required fields');
      return;
    }

    if (formData.title.length < 5) {
      setStatus('error');
      setMessage('Title must be at least 5 characters');
      return;
    }

    if (formData.description.length < 10) {
      setStatus('error');
      setMessage('Description must be at least 10 characters');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      await axios.post(
        `${API_URL}/feedback`,
        {
          ...formData,
          url: window.location.href
        },
        config
      );

      setStatus('success');
      setMessage('Thank you for your feedback! We\'ll review it shortly.');
      
      // Reset form
      setFormData({
        type: 'bug',
        title: '',
        description: '',
        email: user?.email || ''
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);

    } catch (error) {
      console.error('Feedback submission error:', error);
      setStatus('error');
      setMessage(
        error.response?.data?.message || 
        'Failed to submit feedback. Please try again.'
      );
    }
  };

  return (
    <Card className="border-2 border-[hsl(var(--color-primary)/0.2)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--color-primary)/0.1)]">
            <MessageSquare className="h-6 w-6 text-[hsl(var(--color-primary))]" />
          </div>
          <div>
            <CardTitle>Feedback & Bug Reports</CardTitle>
            <CardDescription>
              Help us improve ChessMaster by reporting bugs or suggesting features
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {status === 'success' ? (
          // Success State
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[hsl(var(--color-foreground))] mb-2">
                Feedback Submitted!
              </h3>
              <p className="text-[hsl(var(--color-muted-foreground))]">
                {message}
              </p>
            </div>
            <Button 
              onClick={() => setStatus('idle')}
              variant="outline"
            >
              Submit Another
            </Button>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Feedback Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[hsl(var(--color-foreground))]">
                Feedback Type *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {feedbackTypes.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: value })}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      formData.type === value
                        ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)]'
                        : 'border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary)/0.5)]'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${color}`} />
                    <p className="text-xs font-medium text-[hsl(var(--color-foreground))]">
                      {label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-[hsl(var(--color-foreground))]">
                Title *
              </label>
              <Input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Brief description of the issue or suggestion"
                maxLength={200}
              />
              <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-[hsl(var(--color-foreground))]">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide detailed information about the bug or feature request"
                maxLength={2000}
                rows={5}
                className="w-full px-3 py-2 text-sm font-medium rounded-md border bg-[hsl(var(--color-background)/0.4)] border-[hsl(var(--color-border)/0.5)] text-[hsl(var(--color-foreground))] placeholder:text-[hsl(var(--color-muted-foreground)/0.8)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-ring))]"
              />
              <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Email (Optional for non-logged users) */}
            {!user && (
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[hsl(var(--color-foreground))]">
                  Email (Optional)
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
                  We'll only use this to follow up on your feedback
                </p>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && message && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{message}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="w-full"
            >
              {status === 'loading' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>

            {/* Info Badge */}
            <div className="pt-2">
              <Badge variant="outline" className="text-xs">
                💡 Tip: Be as specific as possible to help us resolve issues faster
              </Badge>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackBox;