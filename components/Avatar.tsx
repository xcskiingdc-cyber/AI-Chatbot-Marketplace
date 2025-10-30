
import React from 'react';
import useIndexedDBImage from '../hooks/useIndexedDBImage';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageId: string;
  alt: string;
}

const Avatar: React.FC<AvatarProps> = ({ imageId, alt, ...props }) => {
    const imageUrl = useIndexedDBImage(imageId);

    if (!imageUrl) {
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
            src={imageUrl}
            alt={alt}
            {...props}
        />
    );
};

export default Avatar;