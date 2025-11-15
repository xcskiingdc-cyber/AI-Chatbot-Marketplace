

import React from 'react';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageId: string | null | undefined;
  alt: string;
}

const Avatar: React.FC<AvatarProps> = ({ imageId, alt, ...props }) => {
    if (!imageId) {
        return (
            <div 
                className={`${props.className || ''} bg-tertiary animate-pulse`}
                style={{
                    width: props.width,
                    height: props.height,
                }}
            />
        );
    }

    return (
        <img
            src={imageId}
            alt={alt}
            {...props}
        />
    );
};

export default Avatar;
