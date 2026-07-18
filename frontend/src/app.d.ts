/// <reference types="@testing-library/jest-dom/vitest" />

declare global {
  namespace App {
    interface PageData {}
    interface Error {}
    interface Locals {}
    interface Platform {}
  }
}

export {};
