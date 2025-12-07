'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RocketLaunchIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

type ProjectGoal = {
  id: string;
  title: string;
  type: 'project' | 'goal';
  tag?: string;
  tagColor?: string;
  dueDate?: string;
  displayOrder: number;
};

// Bootstrap 5 color palette
const BOOTSTRAP_COLORS = [
  { name: 'Blue', value: '#0d6efd' },
  { name: 'Indigo', value: '#6610f2' },
  { name: 'Purple', value: '#6f42c1' },
  { name: 'Pink', value: '#d63384' },
  { name: 'Red', value: '#dc3545' },
  { name: 'Orange', value: '#fd7e14' },
  { name: 'Yellow', value: '#ffc107' },
  { name: 'Green', value: '#198754' },
  { name: 'Teal', value: '#20c997' },
  { name: 'Cyan', value: '#0dcaf0' },
];

function SortableItem({
  item,
  editingItem,
  editTitle,
  editTag,
  editTagColor,
  editDueDate,
  setEditTitle,
  setEditTag,
  setEditTagColor,
  setEditDueDate,
  startEdit,
  saveEdit,
  cancelEdit
}: {
  item: ProjectGoal;
  editingItem: string | null;
  editTitle: string;
  editTag: string;
  editTagColor: string;
  editDueDate: string;
  setEditTitle: (title: string) => void;
  setEditTag: (tag: string) => void;
  setEditTagColor: (color: string) => void;
  setEditDueDate: (date: string) => void;
  startEdit: (item: ProjectGoal) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (editingItem === item.id) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
      >
        <input
          type="text"
          placeholder="Title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
        />
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          placeholder="Due date (optional)"
        />
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Tag (optional, max 20 chars)"
            value={editTag}
            onChange={(e) => setEditTag(e.target.value.slice(0, 20))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          />
          <select
            value={editTagColor}
            onChange={(e) => setEditTagColor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow cursor-pointer font-medium"
            style={{
              minWidth: '120px',
              backgroundColor: `${editTagColor}20`,
              color: editTagColor,
              border: `1px solid ${editTagColor}40`
            }}
            title="Tag color"
          >
            {BOOTSTRAP_COLORS.map((color) => (
              <option
                key={color.value}
                value={color.value}
                style={{
                  backgroundColor: `${color.value}20`,
                  color: color.value
                }}
              >
                {color.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => saveEdit(item.id)}
            className="px-4 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-black transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-move flex-shrink-0">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {item.type === 'project' ? (
        <RocketLaunchIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      ) : (
        <TrophyIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      )}
      <span className="font-medium">{item.title}</span>
      {item.tag && item.tagColor && (
        <span
          className="inline-block px-2 py-0.5 text-xs font-medium rounded ml-2"
          style={{
            backgroundColor: `${item.tagColor}20`,
            color: item.tagColor,
            border: `1px solid ${item.tagColor}40`
          }}
        >
          {item.tag}
        </span>
      )}
      <button
        onClick={() => startEdit(item)}
        className="ml-auto p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        title="Edit"
      >
        <PencilSquareIcon className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

export default function ProjectsGoalsAdmin() {
  const [items, setItems] = useState<ProjectGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editTagColor, setEditTagColor] = useState('#0d6efd');
  const [editDueDate, setEditDueDate] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, type, tag, tag_color, due_date, display_order')
        .is('completed_at', null)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedItems: ProjectGoal[] = (data || []).map((item, index) => ({
        id: item.id,
        title: item.title,
        type: item.type as 'project' | 'goal',
        tag: item.tag || undefined,
        tagColor: item.tag_color || undefined,
        dueDate: item.due_date || undefined,
        displayOrder: item.display_order ?? index + 1,
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveOrder = async () => {
    try {
      setSaving(true);

      // Update display_order for all items
      const updates = items.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('projects')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      alert('Order saved successfully!');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: ProjectGoal) => {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditTag(item.tag || '');
    setEditTagColor(item.tagColor || '#0d6efd');
    setEditDueDate(item.dueDate || '');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditTitle('');
    setEditTag('');
    setEditTagColor('#0d6efd');
    setEditDueDate('');
  };

  const saveEdit = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: editTitle,
          tag: editTag || null,
          tag_color: editTag ? editTagColor : null,
          due_date: editDueDate || null,
        })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setItems(items.map(item =>
        item.id === itemId
          ? { ...item, title: editTitle, tag: editTag || undefined, tagColor: editTag ? editTagColor : undefined, dueDate: editDueDate || undefined }
          : item
      ));

      cancelEdit();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary-black mb-2">Projects/Goals Order</h1>
            <p className="text-gray-600">Drag and drop to reorder your projects and goals. Changes are saved manually.</p>
          </div>

          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No projects/goals found</p>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 mb-6">
                    {items.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        editingItem={editingItem}
                        editTitle={editTitle}
                        editTag={editTag}
                        editTagColor={editTagColor}
                        editDueDate={editDueDate}
                        setEditTitle={setEditTitle}
                        setEditTag={setEditTag}
                        setEditTagColor={setEditTagColor}
                        setEditDueDate={setEditDueDate}
                        startEdit={startEdit}
                        saveEdit={saveEdit}
                        cancelEdit={cancelEdit}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="flex gap-3">
                <button
                  onClick={saveOrder}
                  disabled={saving}
                  className="px-6 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Order'}
                </button>
                <button
                  onClick={fetchItems}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
