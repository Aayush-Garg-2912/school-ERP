"use client";

import React, { useState, useEffect } from "react";
import { Badge, Popover, Button, List, Typography, Space, Empty, Spin } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import api from "@/lib/api";

const { Text } = Typography;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/notifications");
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch {
      // Ignore if unauthenticated or on initial load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const content = (
    <div style={{ width: 340, maxHeight: 400, overflowY: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={markAllRead}
            icon={<CheckOutlined />}
            style={{ padding: 0 }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: "8px 4px",
                background: item.isRead ? "transparent" : "#f0f7ff",
                borderRadius: 6,
                marginBottom: 4,
                cursor: "pointer",
              }}
              onClick={() => !item.isRead && markSingleRead(item._id)}
            >
              <List.Item.Meta
                title={
                  <Space style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text orientation="left" style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600 }}>
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#1677ff",
                          display: "inline-block",
                        }}
                      />
                    )}
                  </Space>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 4]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ width: 40, height: 40 }}
        />
      </Badge>
    </Popover>
  );
}
