/**
 * React Native Component Primitives for Cross-Platform Web & Native Compatibility.
 * Seamlessly integrates React Native style objects, inline styles, and Tailwind utility classes.
 */

import React, {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  useEffect,
  useState,
} from 'react';

// Style Types
export type StyleProp = CSSProperties | (CSSProperties | undefined | null | false)[] | undefined;

function flattenStyle(style?: StyleProp): CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean));
  }
  return style;
}

// -------------------------------------------------------------
// 1. StyleSheet Utility
// -------------------------------------------------------------
export const StyleSheet = {
  create<T extends Record<string, CSSProperties>>(styles: T): T {
    return styles;
  },
  flatten(style?: StyleProp): CSSProperties {
    return flattenStyle(style);
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as CSSProperties,
};

// -------------------------------------------------------------
// 2. View Component
// -------------------------------------------------------------
export interface ViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  style?: StyleProp;
  className?: string;
  children?: ReactNode;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  onPress?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const View = forwardRef<HTMLDivElement, ViewProps>(
  (
    {
      style,
      className = '',
      children,
      testID,
      accessible,
      accessibilityLabel,
      accessibilityRole,
      onPress,
      onClick,
      ...rest
    },
    ref
  ) => {
    const flat = flattenStyle(style);
    const hasRow = className.includes('flex-row');
    const isGrid = className.includes('grid');
    const isInline = className.includes('inline-flex');

    const computedStyle: CSSProperties = {
      boxSizing: 'border-box',
      display: isGrid ? undefined : isInline ? 'inline-flex' : 'flex',
      flexDirection: hasRow ? 'row' : flat.flexDirection ? flat.flexDirection : isGrid ? undefined : 'column',
      ...flat,
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onPress) onPress(e);
      if (onClick) onClick(e);
    };

    return (
      <div
        ref={ref}
        data-testid={testID}
        aria-label={accessibilityLabel}
        role={accessibilityRole}
        style={computedStyle}
        className={className}
        onClick={onPress || onClick ? handleClick : undefined}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
View.displayName = 'View';

// -------------------------------------------------------------
// 3. Text Component
// -------------------------------------------------------------
export interface TextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> {
  style?: StyleProp;
  className?: string;
  children?: ReactNode;
  numberOfLines?: number;
  testID?: string;
  onPress?: () => void;
  accessibilityRole?: string;
}

export const Text = forwardRef<HTMLSpanElement, TextProps>(
  (
    {
      style,
      className = '',
      children,
      numberOfLines,
      testID,
      onPress,
      accessibilityRole,
      ...rest
    },
    ref
  ) => {
    const flat = flattenStyle(style);
    const lineClampStyle: CSSProperties = numberOfLines
      ? {
          display: '-webkit-box',
          WebkitLineClamp: numberOfLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }
      : {};

    const computedStyle: CSSProperties = {
      boxSizing: 'border-box',
      ...lineClampStyle,
      ...flat,
    };

    return (
      <span
        ref={ref}
        data-testid={testID}
        role={accessibilityRole}
        style={computedStyle}
        className={className}
        onClick={onPress}
        {...rest}
      >
        {children}
      </span>
    );
  }
);
Text.displayName = 'Text';

// -------------------------------------------------------------
// 4. TouchableOpacity Component
// -------------------------------------------------------------
export interface TouchableOpacityProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  style?: StyleProp;
  className?: string;
  children?: ReactNode;
  onPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  activeOpacity?: number;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
}

export const TouchableOpacity = forwardRef<HTMLButtonElement, TouchableOpacityProps>(
  (
    {
      style,
      className = '',
      children,
      onPress,
      activeOpacity = 0.75,
      disabled = false,
      testID,
      accessibilityLabel,
      accessibilityRole = 'button',
      ...rest
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    const flat = flattenStyle(style);

    const computedStyle: CSSProperties = {
      opacity: disabled ? 0.5 : isPressed ? activeOpacity : flat.opacity ?? 1,
      transition: 'opacity 0.15s ease, transform 0.1s ease',
      transform: isPressed && !disabled ? 'scale(0.98)' : 'scale(1)',
      ...flat,
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        data-testid={testID}
        aria-label={accessibilityLabel}
        role={accessibilityRole}
        style={computedStyle}
        className={`cursor-pointer disabled:cursor-not-allowed select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#e08744] ${className}`}
        onMouseDown={() => !disabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => !disabled && setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onClick={onPress}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
TouchableOpacity.displayName = 'TouchableOpacity';

// -------------------------------------------------------------
// 5. Pressable Component
// -------------------------------------------------------------
export interface PressableProps extends ViewProps {
  onPress?: () => void;
  disabled?: boolean;
}

export const Pressable = forwardRef<HTMLDivElement, PressableProps>(
  ({ onPress, disabled, style, className = '', children, ...rest }, ref) => {
    const [pressed, setPressed] = useState(false);

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onPress?.();
          }
        }}
        onMouseDown={() => !disabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={() => !disabled && onPress?.()}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: pressed ? 0.8 : 1,
          ...flattenStyle(style),
        }}
        className={className}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
Pressable.displayName = 'Pressable';

// -------------------------------------------------------------
// 6. ScrollView Component
// -------------------------------------------------------------
export interface ScrollViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: StyleProp;
  style?: StyleProp;
  className?: string;
  children?: ReactNode;
  testID?: string;
}

export const ScrollView = forwardRef<HTMLDivElement, ScrollViewProps>(
  (
    {
      horizontal = false,
      showsHorizontalScrollIndicator = true,
      showsVerticalScrollIndicator = true,
      contentContainerStyle,
      style,
      className = '',
      children,
      testID,
      ...rest
    },
    ref
  ) => {
    const computedOuterStyle: CSSProperties = {
      overflowX: horizontal ? 'auto' : 'hidden',
      overflowY: horizontal ? 'hidden' : 'auto',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box',
      ...flattenStyle(style),
    };

    const computedInnerStyle: CSSProperties = {
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'column',
      minWidth: horizontal ? 'max-content' : undefined,
      boxSizing: 'border-box',
      ...flattenStyle(contentContainerStyle),
    };

    return (
      <div
        ref={ref}
        data-testid={testID}
        style={computedOuterStyle}
        className={`scroll-smooth ${className} ${
          !showsHorizontalScrollIndicator || !showsVerticalScrollIndicator
            ? 'no-scrollbar'
            : ''
        }`}
        {...rest}
      >
        <div style={computedInnerStyle}>{children}</div>
      </div>
    );
  }
);
ScrollView.displayName = 'ScrollView';

// -------------------------------------------------------------
// 7. Image Component
// -------------------------------------------------------------
export interface ImageSourcePropType {
  uri: string;
}

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'style'> {
  source: ImageSourcePropType | string;
  style?: StyleProp;
  className?: string;
  resizeMode?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  testID?: string;
  alt?: string;
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ source, style, className = '', resizeMode = 'cover', testID, alt = '', onError, ...rest }, ref) => {
    const src = typeof source === 'string' ? source : source?.uri;
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setHasError(false);
    }, [src]);

    const computedStyle: CSSProperties = {
      objectFit: resizeMode as CSSProperties['objectFit'],
      boxSizing: 'border-box',
      display: 'block',
      ...flattenStyle(style),
    };

    if (hasError || !src) {
      return (
        <div
          data-testid={testID}
          aria-label={alt || undefined}
          style={{
            ...computedStyle,
            backgroundColor: '#f5ece7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#877367',
            fontSize: '12px',
            overflow: 'hidden',
          }}
          className={className}
        >
          <span>Photo</span>
        </div>
      );
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        data-testid={testID}
        style={computedStyle}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }
);
Image.displayName = 'Image';

// -------------------------------------------------------------
// 8. TextInput Component
// -------------------------------------------------------------
export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'style' | 'onChange'> {
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp;
  className?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  testID?: string;
}

export const TextInput = forwardRef<HTMLInputElement & HTMLTextAreaElement, TextInputProps>(
  (
    {
      value,
      onChangeText,
      multiline = false,
      numberOfLines = 3,
      style,
      className = '',
      placeholder,
      keyboardType = 'default',
      secureTextEntry = false,
      testID,
      ...rest
    },
    ref
  ) => {
    const computedStyle: CSSProperties = {
      boxSizing: 'border-box',
      outline: 'none',
      width: '100%',
      ...flattenStyle(style),
    };

    const inputType = secureTextEntry
      ? 'password'
      : keyboardType === 'numeric'
      ? 'number'
      : keyboardType === 'email-address'
      ? 'email'
      : keyboardType === 'phone-pad'
      ? 'tel'
      : 'text';

    if (multiline) {
      return (
        <textarea
          ref={ref as unknown as React.Ref<HTMLTextAreaElement>}
          value={value}
          rows={numberOfLines}
          placeholder={placeholder}
          data-testid={testID}
          style={computedStyle}
          className={className}
          onChange={(e) => onChangeText?.(e.target.value)}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }

    return (
      <input
        ref={ref as unknown as React.Ref<HTMLInputElement>}
        type={inputType}
        value={value}
        placeholder={placeholder}
        data-testid={testID}
        style={computedStyle}
        className={className}
        onChange={(e) => onChangeText?.(e.target.value)}
        {...rest}
      />
    );
  }
);
TextInput.displayName = 'TextInput';

// -------------------------------------------------------------
// 9. SafeAreaView Component
// -------------------------------------------------------------
export interface SafeAreaViewProps extends ViewProps {}

export const SafeAreaView = forwardRef<HTMLDivElement, SafeAreaViewProps>(
  ({ style, className = '', children, ...rest }, ref) => {
    const computedStyle: CSSProperties = {
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
      ...flattenStyle(style),
    };

    return (
      <View ref={ref} style={computedStyle} className={className} {...rest}>
        {children}
      </View>
    );
  }
);
SafeAreaView.displayName = 'SafeAreaView';
