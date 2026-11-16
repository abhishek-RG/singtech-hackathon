"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { QrCode } from "lucide-react";

// Public URL for judges' phones. NEXT_PUBLIC_DEAL_ROOM_URL is a plain URL, not a secret.
const dealRoomUrl = () => process.env.NEXT_PUBLIC_DEAL_ROOM_URL || `${window.location.origin}/deal-room`;

export function PitchQrButton() {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<{ url: string; src: string }>();

  const show = async () => {
    const url = dealRoomUrl();
    setQr({ url, src: await QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: "#0A0A0C", light: "#FFFFFF" } }) });
    setOpen(true);
  };

  const isLocal = qr && /\/\/(localhost|127\.0\.0\.1)/.test(qr.url);
  return (
    <>
      <Button size="sm" variant="secondary" label="Pitch QR" icon={<QrCode aria-hidden className="size-4" />} onClick={show} width="100%" />
      <Dialog isOpen={open} onOpenChange={setOpen} width={360}>
        <DialogHeader title="Join the live deal room" subtitle="Scan to post questions; SingTech AI answers in Salesforce Chatter." onOpenChange={setOpen} />
        {qr && (
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Data URL from the qrcode package; next/image adds nothing for an inline PNG. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.src} alt={`QR code for ${qr.url}`} width={240} height={240} />
            <a href={qr.url} target="_blank" rel="noopener noreferrer" className="font-id break-all text-center text-primary underline">
              {qr.url}
            </a>
            {isLocal && <p className="text-center text-[12px] text-st-warning">This address only works on this computer. Set the public deal-room address before the pitch.</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}
