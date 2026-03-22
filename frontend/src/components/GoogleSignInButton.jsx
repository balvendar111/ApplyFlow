import { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GSI_SCRIPT = "https://accounts.google.com/gsi/client";

let gsiInitialized = false;

export default function GoogleSignInButton({ onSuccess, onError, text = "signin_with" }) {
  const containerRef = useRef(null);
  const callbacksRef = useRef({ onSuccess, onError });
  callbacksRef.current = { onSuccess, onError };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    const loadScript = () => {
      if (window.google?.accounts?.id) {
        renderButton();
        return;
      }
      const script = document.createElement("script");
      script.src = GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      script.onerror = () => callbacksRef.current.onError?.("Failed to load Google Sign-In");
      document.head.appendChild(script);
    };

    const renderButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      try {
        if (!gsiInitialized) {
          gsiInitialized = true;
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (res) => {
              const { onSuccess: os, onError: oe } = callbacksRef.current;
              if (res.credential) os?.(res.credential);
              else oe?.("No credential received");
            },
          });
        }
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          width: 320,
          shape: "rectangular",
        });
      } catch (e) {
        callbacksRef.current.onError?.(e.message);
      }
    };

    loadScript();
  }, [GOOGLE_CLIENT_ID, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="min-w-[200px] min-h-[40px]" />
    </div>
  );
}
