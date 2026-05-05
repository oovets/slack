type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  campaignName?: string;
};

export function Header({ campaignName, ...rest }: HeaderProps) {
  return (
    <header
      id="dashboard-header"
      {...rest}
      className="relative mb-[14px] mt-[70px] flex h-[72px] w-full max-w-full items-center justify-center"
    >
      <h1
        id="dashboard-header-title"
        className="eidra-sans pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-[min(100%,1000px)] -translate-x-1/2 -translate-y-1/2 text-center text-[60px] leading-[60px]"
        style={{
          textRendering: "geometricPrecision",
        }}
      >
        <span className="font-medium text-black/60">Live metrics from </span>
        <span className="font-bold text-black">
          {campaignName?.trim() ? campaignName : "booth"}
        </span>
      </h1>
    </header>
  );
}
