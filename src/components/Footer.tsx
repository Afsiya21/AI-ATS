export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-background/60">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row">
        <p>&copy; {new Date().getFullYear()} AI-ATS. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <span className="hover:text-foreground transition cursor-pointer">About</span>
          <span className="hover:text-foreground transition cursor-pointer">Contact</span>
          <span className="hover:text-foreground transition cursor-pointer">Privacy</span>
        </div>
      </div>
    </footer>
  );
}
