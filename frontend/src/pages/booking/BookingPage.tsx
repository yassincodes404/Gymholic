import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { availabilityApi } from '../../api/availability';
import { bookingApi } from '../../api/bookings';
import { detectUserTimezone, formatTimeRange, getTimezoneOffset } from '../../utils/timezone';
import type { AvailableSlot } from '../../types/booking';

export const BookingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const assessmentId = location.state?.assessmentId;

  // Detect client's timezone on mount
  const [clientTimezone] = useState<string>(detectUserTimezone());
  const [timezoneOffset] = useState<string>(getTimezoneOffset(clientTimezone));

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real app, this would be fetched from an API or passed via routing
  const expertId = 1; // Assuming trainer ID 1 for now

  useEffect(() => {
    const fetchSlots = async () => {
      setError(null);
      try {
        const response = await availabilityApi.getSlots(expertId, date, clientTimezone);
        setSlots(response.data || []);
      } catch (err: any) {
        console.error('Failed to fetch slots', err);
        setError(err.response?.data?.message || 'Failed to load available slots');
        setSlots([]);
      }
    };
    fetchSlots();
  }, [date, clientTimezone, expertId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await bookingApi.create({
        trainerId: expertId,
        startTime: selectedSlot.startTime, // UTC instant from backend
        endTime: selectedSlot.endTime,     // UTC instant from backend
        clientTimezone: clientTimezone,
        assessmentId: assessmentId || undefined,
        notes: 'Consultation booking',
      });

      // Navigate to payment
      navigate('/payment', { state: { bookingId: response.data.id } });
    } catch (err: any) {
      console.error('Booking failed:', err);
      setError(err.response?.data?.message || 'Failed to create booking. Please try another slot.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-card p-8 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-2">Select a Time</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Times shown in your timezone: <strong>{clientTimezone}</strong> ({timezoneOffset})
      </p>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null); // Clear selection when date changes
          }}
          min={new Date().toISOString().split('T')[0]} // Prevent past dates
          className="border px-3 py-2 rounded-md"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Available Slots</label>
        <div className="grid grid-cols-3 gap-3">
          {slots.length === 0 ? (
            <div className="col-span-3 text-muted-foreground text-sm py-4 text-center">
              {isLoading ? 'Loading slots...' : 'No slots available on this date.'}
            </div>
          ) : (
            slots.map((slot, index) => (
              <button
                key={`${slot.startTime}-${index}`}
                onClick={() => setSelectedSlot(slot)}
                className={`py-3 px-4 rounded-md border text-sm transition-colors ${
                  selectedSlot?.startTime === slot.startTime
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:border-primary hover:bg-accent'
                }`}
                title={`Expert time: ${slot.expertDisplayTime} (${slot.expertTimezone})`}
              >
                <div className="font-medium">{slot.displayTime}</div>
                {slot.expertDisplayTime !== slot.displayTime && (
                  <div className="text-xs opacity-70 mt-1">
                    ({slot.expertDisplayTime} expert)
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedSlot && (
        <div className="mb-4 p-3 bg-accent/50 border rounded-md text-sm">
          <p className="font-medium mb-1">Selected Time:</p>
          <p>
            {formatTimeRange(selectedSlot.startTime, selectedSlot.endTime, clientTimezone)}
          </p>
          {selectedSlot.expertTimezone !== clientTimezone && (
            <p className="text-muted-foreground text-xs mt-1">
              Expert's time: {selectedSlot.expertDisplayTime} ({selectedSlot.expertTimezone})
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleBook}
        disabled={!selectedSlot || isLoading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Booking...' : 'Confirm & Proceed to Payment'}
      </button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Consultation duration: 45 minutes
      </p>
    </div>
  );
};
