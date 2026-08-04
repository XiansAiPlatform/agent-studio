/** Default title block for the top-level streams list view. */
export function StreamsTitle() {
  return (
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
        Log Streams
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5">
        Browse log streams (workflows) and drill into a stream to view its logs
      </p>
    </div>
  );
}
