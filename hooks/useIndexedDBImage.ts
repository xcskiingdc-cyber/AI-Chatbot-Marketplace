
import { useState, useEffect } from 'react';
import { getImage } from '../services/dbService';

const useIndexedDBImage = (imageId: string | null | undefined) => {
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        // If the imageId is already a full URL (http, data, blob), just use it directly.
        if (!imageId || imageId.startsWith('http') || imageId.startsWith('data:') || imageId.startsWith('blob:')) {
            setImageUrl(imageId || undefined);
            return;
        }

        let objectUrl: string | null = null;

        const loadImage = async () => {
            try {
                const imageBlob = await getImage(imageId);
                if (imageBlob) {
                    objectUrl = URL.createObjectURL(imageBlob);
                    setImageUrl(objectUrl);
                } else {
                    // Fallback image if not found in DB
                    setImageUrl(`https://i.pravatar.cc/150?u=${imageId}`);
                }
            } catch (error) {
                console.error("Failed to load image from IndexedDB", error);
                setImageUrl(`https://i.pravatar.cc/150?u=fallback`);
            }
        };

        loadImage();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imageId]);

    return imageUrl;
};

export default useIndexedDBImage;
