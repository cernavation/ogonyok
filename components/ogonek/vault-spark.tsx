'use client'

import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'

interface VaultSparkProps {
  active: boolean
  onComplete?: () => void
}

const SPARK_COUNT = 6

export function VaultSpark({ active, onComplete }: VaultSparkProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <motion.div
          className="vault-spark-container"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: SPARK_COUNT }).map((_, i) => {
            const angle = (i * 360) / SPARK_COUNT
            const rad = (angle * Math.PI) / 180
            const distance = 28
            const x = Math.cos(rad) * distance
            const y = Math.sin(rad) * distance

            return (
              <motion.div
                key={i}
                className="vault-spark-particle"
                style={{
                  position: 'absolute',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: i % 2 === 0 ? '#ff6b35' : '#ffa600',
                  boxShadow: '0 0 8px #ff6b35',
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x,
                  y: y - 10,
                  scale: [0, 1.4, 0],
                  opacity: [1, 0.8, 0],
                }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
