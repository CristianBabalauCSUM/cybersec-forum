export {};

declare global {
    interface String {
      capitalize(): string;
      generateSlug(): string;
    }
  }
  