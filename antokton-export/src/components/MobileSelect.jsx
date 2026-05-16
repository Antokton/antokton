import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "./useMediaQuery";

export default function MobileSelect({ value, onValueChange, placeholder, children, triggerClassName, ...props }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = React.useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  // Extract options from children
  const options = React.Children.toArray(children).filter(
    child => child.type === SelectItem
  );

  const selectedOption = options.find(opt => opt.props.value === value);
  const selectedLabel = selectedOption?.props.children || placeholder;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={`w-full justify-between ${triggerClassName}`}
      >
        {selectedLabel}
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-2 p-4 pb-8">
            {options.map((option) => (
              <Button
                key={option.props.value}
                variant={value === option.props.value ? "default" : "outline"}
                onClick={() => {
                  onValueChange(option.props.value);
                  setOpen(false);
                }}
                className="w-full justify-start"
              >
                {option.props.children}
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}