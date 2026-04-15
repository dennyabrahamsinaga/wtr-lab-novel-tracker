import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
process.stdout.write(
  [
    "VAPID_PUBLIC_KEY=" + keys.publicKey,
    "VAPID_PRIVATE_KEY=" + keys.privateKey,
    "",
  ].join("\n"),
);

