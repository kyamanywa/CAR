import { useState, useEffect } from 'react';
import { getOrderTimeline, addTrackingEvent } from '../api';
import { MapPin, CheckCircle, Circle, Clock, Plus, X } from 'lucide-react';

export default function TrackingTimeline({ orderId, onClose }) {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_type: '',
    location: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [orderId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await getOrderTimeline(orderId);
      setTimeline(res.data.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addTrackingEvent({
        ...newEvent,
        order_id: orderId
      });
      setShowAddEvent(false);
      setNewEvent({
        event_type: '',
        location: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0]
      });
      fetchTimeline();
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add tracking event');
    } finally {
      setSubmitting(false);
    }
  };

  const eventTypes = [
    { value: 'DEPARTURE', label: 'Departure from Origin', color: 'blue' },
    { value: 'PORT_ARRIVAL', label: 'Arrived at Port (Mombasa)', color: 'green' },
    { value: 'CUSTOMS_CLEARANCE', label: 'Customs Cleared', color: 'yellow' },
    { value: 'BORDER_CROSSING', label: 'Border Crossing (Malaba/Busia)', color: 'orange' },
    { value: 'INLAND_TRANSIT', label: 'Inland Transit', color: 'purple' },
    { value: 'FINAL_DELIVERY', label: 'Final Delivery', color: 'emerald' }
  ];

  const getEventColor = (type) => {
    const event = eventTypes.find(e => e.value === type);
    return event?.color || 'gray';
  };

  const formatEventType = (type) => {
    const event = eventTypes.find(e => e.value === type);
    return event?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!timeline) {
    return <div>No tracking data available</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Shipment Tracking</h2>
            <p className="text-sm text-gray-500">Order: {timeline.order?.order_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Current Location Badge */}
          {timeline.current_location && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Current Location</p>
                  <p className="font-semibold text-blue-900">{timeline.current_location}</p>
                </div>
              </div>
              {timeline.last_update && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Last Update</p>
                  <p className="text-sm font-medium">{new Date(timeline.last_update).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Add Event Button */}
          <div className="mb-6">
            {!showAddEvent ? (
              <button
                onClick={() => setShowAddEvent(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Tracking Event
              </button>
            ) : (
              <form onSubmit={handleAddEvent} className="card bg-gray-50">
                <h3 className="font-semibold mb-4">New Tracking Event</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Event Type</label>
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">Select event type...</option>
                      {eventTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="input"
                      placeholder="e.g., Mombasa Port, Kenya"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description (Optional)</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="input"
                      rows="2"
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? 'Adding...' : 'Add Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg mb-4">Tracking History</h3>
            {timeline.events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No tracking events yet</p>
                <p className="text-sm">Add events to track the shipment journey</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200"></div>
                
                {timeline.events.map((event, index) => {
                  const color = getEventColor(event.event_type);
                  const isLast = index === timeline.events.length - 1;
                  
                  return (
                    <div key={event.id} className="relative pl-12 pb-8">
                      {/* Circle indicator */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full bg-${color}-100 border-4 border-white flex items-center justify-center shadow-sm`}>
                        {isLast ? (
                          <CheckCircle className={`w-4 h-4 text-${color}-600`} />
                        ) : (
                          <Circle className={`w-3 h-3 fill-${color}-600 text-${color}-600`} />
                        )}
                      </div>
                      
                      {/* Event content */}
                      <div className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{formatEventType(event.event_type)}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          </div>
                          <span className={`badge badge-${color}`}>
                            {new Date(event.event_date).toLocaleDateString()}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                        )}
                        {event.created_by_name && (
                          <p className="text-xs text-gray-400 mt-2">Added by {event.created_by_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
