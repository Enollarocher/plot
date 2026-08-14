"use client";

import { useEffect, useRef, useState } from "react";

type CodeDetecte = { rawValue: string };
type DetecteurCodeBarres = { detect: (source: CanvasImageSource) => Promise<CodeDetecte[]> };

function creerDetecteur(): DetecteurCodeBarres | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (options: { formats: string[] }) => DetecteurCodeBarres;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  return new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
}

/** Vrai si le navigateur courant expose l'API BarcodeDetector (pas Safari/iOS à ce jour). */
export function scanCodeBarresSupporte() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function BarcodeScanner({
  onDetecte,
  onFermer,
}: {
  onDetecte: (isbn: string) => void;
  onFermer: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;
    let frame = 0;
    let stream: MediaStream | null = null;

    async function demarrer() {
      const detecteur = creerDetecteur();
      if (!detecteur) {
        setErreur("Le scan n'est pas pris en charge par ce navigateur.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setErreur("Impossible d'accéder à la caméra — vérifie les autorisations.");
        return;
      }

      if (annule || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const boucle = async () => {
        if (annule || !videoRef.current) return;
        try {
          const codes = await detecteur.detect(videoRef.current);
          if (codes.length > 0) {
            onDetecte(codes[0].rawValue);
            return;
          }
        } catch {
          // image de la frame illisible : on retente à la suivante
        }
        frame = requestAnimationFrame(boucle);
      };
      frame = requestAnimationFrame(boucle);
    }

    demarrer();

    return () => {
      annule = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="plot-scanner">
      {erreur ? (
        <p className="plot-panneau-erreur">{erreur}</p>
      ) : (
        <video ref={videoRef} className="plot-scanner-video" muted playsInline />
      )}
      <button type="button" className="plot-lien-manuel" onClick={onFermer}>
        Annuler le scan
      </button>
    </div>
  );
}
