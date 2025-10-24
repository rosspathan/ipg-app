interface TreeConnectorProps {
  childrenCount: number;
}

export function TreeConnector({ childrenCount }: TreeConnectorProps) {
  if (childrenCount === 0) return null;

  return (
    <div className="absolute left-4 top-0 bottom-0 w-px bg-border opacity-50" />
  );
}
