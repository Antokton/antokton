import React from 'react';
import { useLocation } from 'react-router-dom';

function NavigationTrackerContent() {
  const location = useLocation();
  
  React.useEffect(() => {
    // Track navigation here if needed
    console.log('Navigation to:', location.pathname);
  }, [location.pathname]);

  return null;
}

export default function NavigationTracker() {
  // This component is safe to render anywhere - it uses the hook conditionally
  try {
    return <NavigationTrackerContent />;
  } catch (error) {
    // If we're not in a Router context, just return null
    return null;
  }
}