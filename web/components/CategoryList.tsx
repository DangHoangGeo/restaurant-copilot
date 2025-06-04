"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import Link from 'next/link';
import { Category as CategoryType } from '../app/[locale]/dashboard/menu/page'; // Assuming type is exported from page

// Helper to get localized name (very basic)
const getLocalizedName = (name: any, locale: string): string => {
  if (typeof name === 'object' && name !== null) {
    return name[locale] || name['en'] || 'Unnamed';
  }
  return name || 'Unnamed';
};

interface CategoryListProps {
  initialCategories: CategoryType[];
  locale: string;
  restaurantId: string; // Needed for links
}

export default function CategoryList({ initialCategories, locale, restaurantId }: CategoryListProps) {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isBrowser, setIsBrowser] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    // react-beautiful-dnd needs this check to avoid server-side rendering mismatch
    setIsBrowser(true);
  }, []);


  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return; // Dropped outside the list

    const reorderedCategories = Array.from(categories);
    const [removed] = reorderedCategories.splice(source.index, 1);
    reorderedCategories.splice(destination.index, 0, removed);

    setCategories(reorderedCategories); // Optimistic update

    const categoriesToUpdate = reorderedCategories.map((category, index) => ({
      id: category.id,
      position: index,
    }));

    try {
      const response = await fetch('/api/v1/menu/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoriesToUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder categories');
      }
      setFeedback({ type: 'success', message: 'Categories reordered successfully!' });
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      setFeedback({ type: 'error', message: error.message || 'An error occurred.' });
      // Revert to original order on error if desired, or fetch fresh data
      setCategories(initialCategories);
    }
    setTimeout(() => setFeedback(null), 3000); // Clear feedback after 3s
  };

  if (!isBrowser) {
    return null; // Or a placeholder/loader
  }

  return (
    <div>
      {feedback && (
        <div className={`mb-4 p-3 rounded ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback.message}
        </div>
      )}
      <div className="mb-4">
        <Link href={`/${locale}/dashboard/menu/new?restaurantId=${restaurantId}`} legacyBehavior>
          <a className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            New Category
          </a>
        </Link>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {categories.map((category, index) => (
                <Draggable key={category.id} draggableId={category.id} index={index}>
                  {(providedDraggable) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      {...providedDraggable.dragHandleProps}
                      className="bg-white shadow-md rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">
                          {getLocalizedName(category.name, locale)} (Pos: {category.position})
                        </h3>
                        <div className="space-x-2">
                          <Link href={`/${locale}/dashboard/menu/${category.id}/edit?restaurantId=${restaurantId}`} legacyBehavior>
                            <a className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded">Edit</a>
                          </Link>
                          <button
                            onClick={() => alert(`Delete category ${category.id} - (Not implemented)`)}
                            className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="pl-4">
                        <h4 className="text-md font-medium mb-1">Menu Items:</h4>
                        {category.menu_items && category.menu_items.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1">
                            {category.menu_items.map(item => (
                              <li key={item.id} className="text-sm">
                                {item[`name_${locale}` as keyof typeof item] || item.name_en || 'Unnamed Item'} -
                                <span className={item.available ? 'text-green-600' : 'text-red-600'}>
                                  {item.available ? ' Available' : ' Unavailable'}
                                </span>
                                (Pos: {item.position})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No menu items in this category.</p>
                        )}
                         <Link href={`/${locale}/dashboard/menu/${category.id}/items/new?restaurantId=${restaurantId}`} legacyBehavior>
                            <a className="mt-2 text-sm inline-block bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded">
                              New Item
                            </a>
                          </Link>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
