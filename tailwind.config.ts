import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				heading: 'var(--font-heading)',
				body: 'var(--font-body)',
			},
			fontFeatureSettings: {
				'tnum': '"tnum"', // tabular numbers
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					glow: 'hsl(var(--accent-glow))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					glass: 'var(--card-glass)'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				danger: {
					DEFAULT: 'hsl(var(--danger))',
					foreground: 'hsl(var(--danger-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
		backgroundImage: {
			'gradient-primary': 'var(--gradient-primary)',
			'gradient-card': 'var(--gradient-card)',
			'gradient-neon': 'var(--gradient-neon)',
			'gradient-glow': 'var(--gradient-glow)',
			'gradient-ring': 'var(--gradient-ring)'
		},
			backdropBlur: {
				'glass': 'var(--card-blur)'
			},
		boxShadow: {
			'card': 'var(--shadow-card)',
			'button': 'var(--shadow-button)',
			'elevated': 'var(--shadow-elevated)',
			'neon': 'var(--shadow-neon)',
			'fab': 'var(--shadow-fab)',
			'cyber': '0 0 20px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(255 255 255 / 0.1)',
			'glow-primary': '0 8px 32px hsl(var(--primary) / 0.4)',
			'glow-secondary': '0 8px 32px hsl(var(--secondary) / 0.4)'
		},
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem',
				'fab': '68px'
			},
			transitionDuration: {
				'fast': 'var(--duration-fast)',
				'normal': 'var(--duration-normal)', 
				'slow': 'var(--duration-slow)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'slide-in-left': {
					'0%': { opacity: '0', transform: 'translateX(-100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(-10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-scale': {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'count-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: 'var(--shadow-neon)' },
					'50%': { boxShadow: 'var(--shadow-fab)' }
				},
				'cyber-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(var(--primary) / 0.3)',
						borderColor: 'hsl(var(--primary) / 0.3)' 
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(var(--primary) / 0.6)',
						borderColor: 'hsl(var(--primary) / 0.6)' 
					}
				},
				'neon-pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' }
				},
				'slide-up-stagger': {
					'0%': { opacity: '0', transform: 'translateY(40px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'slide-in-right': 'slide-in-right var(--duration-normal) ease-out',
				'slide-in-left': 'slide-in-left var(--duration-normal) ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'fade-in-scale': 'fade-in-scale var(--duration-normal) ease-out',
				'count-up': 'count-up var(--duration-normal) ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'cyber-glow': 'cyber-glow 3s ease-in-out infinite',
				'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
				'slide-up-stagger': 'slide-up-stagger var(--duration-normal) ease-out',
				'shimmer': 'shimmer 2s ease-in-out infinite',
				'slide-in-up': 'slide-in-up 0.3s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
