export function extractDataFromUrl(url: string) {
  const urlObj = new URL(url);

  const GoogleAccessId = urlObj.searchParams.get("GoogleAccessId");
  const Expires = urlObj.searchParams.get("Expires");
  const Signature = urlObj.searchParams.get("Signature");
  const responseContentDisposition = urlObj.searchParams.get(
    "response-content-disposition"
  );

  const fileName =
        responseContentDisposition?.match(/filename="(.+?)"/)?.[1];

  return {
    fileName,
    GoogleAccessId,
    Expires,
    Signature,
    responseContentDisposition,
  };
}
