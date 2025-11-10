import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            "relative px-4 py-2 text-sm font-medium text-gray-300 transition-colors duration-300",
            "hover:text-white hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl",
            "bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-md",
            "border border-transparent hover:border-gray-700",
            className,
            isActive && cn(
              "text-white border-gray-700",
              "before:absolute before:bottom-0 before:left-0 before:h-[2px] before:w-full before:bg-blue-500 before:rounded-full before:animate-pulse",
              activeClassName
            ),
            isPending && cn("opacity-60 cursor-wait", pendingClassName)
          )
        }
        {...props}
      >
        {({ isActive }) => (
          <motion.span
            animate={{ scale: isActive ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {props.children}
          </motion.span>
        )}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
