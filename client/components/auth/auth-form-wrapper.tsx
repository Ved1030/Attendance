"use client";

import { motion } from "framer-motion";
import { AuthLogo } from "./auth-logo";

interface AuthFormWrapperProps {
  children: React.ReactNode;
  showLogo?: boolean;
  footer?: React.ReactNode;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function AuthFormWrapper({
  children,
  showLogo = true,
  footer,
}: AuthFormWrapperProps) {
  return (
    <motion.div
      className="flex flex-col gap-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {showLogo && (
        <motion.div variants={item}>
          <AuthLogo size="lg" />
        </motion.div>
      )}

      <motion.div variants={item}>{children}</motion.div>

      {footer && <motion.div variants={item}>{footer}</motion.div>}
    </motion.div>
  );
}
