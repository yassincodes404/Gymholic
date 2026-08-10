import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentApi } from '../../api/assessments';

export const AssessmentPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userType: 'GYM_OWNER',
    situation: '',
    startTiming: 'WITHIN_1_MONTH',
    preferredConsultation: 'ONLINE',
    fullName: '',
    whatsapp: '',
    email: '',
    preferredLanguage: 'ENGLISH',
    bestTimeToContact: 'Morning'
  });
  const navigate = useNavigate();

  const handleStart = async () => {
    try {
      const response = await assessmentApi.start({ userType: formData.userType });
      setAssessmentId(response.data.id);
      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Failed to start assessment');
    }
  };

  const handleSubmit = async () => {
    if (!assessmentId) return;
    
    // Validate required fields
    if (!formData.fullName || !formData.fullName.trim()) {
      alert('Full name is required');
      return;
    }
    if (!formData.whatsapp || !formData.whatsapp.trim()) {
      alert('WhatsApp number is required');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      alert('Email is required');
      return;
    }
    
    try {
      // Filter submission payload to include only fields expected by SubmitAssessmentRequest
      // Explicitly exclude userType (already stored in assessment from start endpoint)
      const submitPayload = {
        situation: formData.situation,
        startTiming: formData.startTiming,
        preferredConsultation: formData.preferredConsultation,
        fullName: formData.fullName.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim(),
        preferredLanguage: formData.preferredLanguage,
        bestTimeToContact: formData.bestTimeToContact
      };
      
      await assessmentApi.submit(assessmentId, submitPayload);
      // Pass the assessment ID to the booking flow
      navigate('/booking', { state: { assessmentId } });
    } catch (err: any) {
      console.error('Assessment submission error:', err);
      
      // Extract error message from response
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to submit assessment';
      alert(errorMessage);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-card p-8 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Business Assessment</h1>
      
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Who are you?</h2>
          <select 
            value={formData.userType}
            onChange={(e) => setFormData({...formData, userType: e.target.value})}
            className="w-full border px-3 py-2 rounded-md"
          >
            <option value="GYM_OWNER">Gym Owner</option>
            <option value="NEW_GYM_FOUNDER">New Gym Founder</option>
            <option value="PERSONAL_TRAINER">Personal Trainer</option>
          </select>
          <button onClick={handleStart} className="bg-primary text-primary-foreground px-4 py-2 rounded-md mt-4">
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <h2 className="text-lg font-medium">Project Details</h2>
          <div>
            <label className="block text-sm mb-1">Tell us about your situation</label>
            <textarea 
              value={formData.situation}
              onChange={(e) => setFormData({...formData, situation: e.target.value})}
              className="w-full border px-3 py-2 rounded-md h-24"
              placeholder="Describe your current situation and needs..."
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Full Name *</label>
            <input 
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full border px-3 py-2 rounded-md"
              placeholder="Your full name"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">WhatsApp Number *</label>
            <input 
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
              className="w-full border px-3 py-2 rounded-md"
              placeholder="+1234567890"
              required
              minLength={10}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border px-3 py-2 rounded-md"
              placeholder="your@email.com"
              required
            />
          </div>
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md mt-4 w-full">
            Submit & Book Consultation
          </button>
        </form>
      )}
    </div>
  );
};
