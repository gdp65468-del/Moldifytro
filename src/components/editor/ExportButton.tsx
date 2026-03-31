import { Button } from "@/components/ui/Button";

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ExportButton({ onClick, disabled }: ExportButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      Baixar imagem
    </Button>
  );
}
