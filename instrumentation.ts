export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Catch unhandled promise rejections to prevent PM2 restarts
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Promise Rejection:", reason);
    });

    // Catch uncaught exceptions to prevent PM2 restarts
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      // Don't exit — let the process continue serving requests
    });
  }
}
