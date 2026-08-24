import React from "react";

interface MealCardProps {
  name: string;
  protein: string;
  price: string;
  image: string;
}

const MealCard: React.FC<MealCardProps> = ({
  name,
  protein,
  price,
  image,
}) => {
  return (
    <div className="group relative bg-white rounded-3xl shadow-md overflow-hidden transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl">
      
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Price badge */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-lg">
          {price}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-2">
        <h3 className="text-lg font-bold text-gray-800">{name}</h3>
        <p className="text-sm text-gray-500">{protein}</p>

        <button className="mt-3 w-full bg-gradient-to-r from-pink-500 to-rose-400 text-white py-2 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg">
          Add to Plan
        </button>
      </div>
    </div>
  );
};

export default MealCard;