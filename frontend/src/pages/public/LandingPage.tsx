import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-primary mb-6">
        Build Your Fitness Business
      </h1>
      <p className="mt-4 max-w-2xl text-xl text-muted-foreground mb-8">
        Get expert consultation on gym fit-out, equipment selection, and facility management.
      </p>
      <div className="flex space-x-4">
        <Link 
          to="/assessment" 
          className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium text-lg hover:bg-primary/90 transition-colors"
        >
          Start Assessment
        </Link>
      </div>
    </div>
  );
};
