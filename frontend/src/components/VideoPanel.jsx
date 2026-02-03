import React, { useEffect, useRef } from 'react';

export default function VideoPanel({ socket, user }) {
  const localRef = useRef();
  useEffect(() => {
    // Minimal: request camera and show local stream; full WebRTC signaling is handled via socket 'signal' (not implemented fully here).
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localRef.current) localRef.current.srcObject = stream;
      } catch (err) {
        console.warn('Could not get media', err);
      }
    }
    start();
  }, []);
  return (
    <div className="video-panel">
      <h4>Video</h4>
      <video ref={localRef} autoPlay playsInline muted style={{width:'100%', borderRadius:6}} />
      <div className="video-hint">(Local preview)</div>
    </div>
  );
}
