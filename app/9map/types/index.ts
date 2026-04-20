export type PlaceCategory = 'restaurant' | 'drink' | 'snack' | 'other';

export interface Place {
    id: string;
    name: string;
    category: PlaceCategory;
    location: [number, number]; // [lng, lat]
    address: string;
    city?: string;
    note?: string;
    recommended_dishes?: string;
    avoid_dishes?: string;
    tags?: string[];
    expected_spend?: number; // Not used yet but might be useful?
    opening_hours?: string;
    average_price?: string;
    sub_category?: string;
    business_area?: string;
}

export interface PlacesResponse {
    data: Place[];
}
