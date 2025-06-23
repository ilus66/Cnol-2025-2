import { useEffect } from "react";

export default function TestVapidKey() {
  useEffect(() => {
    console.log("VAPID public key:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  }, []);

  return <div>Check the console for the VAPID public key.</div>;
}
