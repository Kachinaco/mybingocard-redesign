const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SearchParamsLike = {
  get(name: string): string | null;
};

export function getInitialLoginEmails(searchParams: SearchParamsLike) {
  const rawEmail = searchParams.get("email")?.trim() || "";

  if (!EMAIL_REGEX.test(rawEmail)) {
    return {
      email: "",
      magicLinkEmail: "",
    };
  }

  return {
    email: rawEmail,
    magicLinkEmail: rawEmail,
  };
}
