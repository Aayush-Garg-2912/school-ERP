"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Space, Divider } from "antd";
import {
  UserOutlined,
  LockOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const identifier = values.identifier || values.email;
      const user = await login(identifier, values.password);
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Failed to log in"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)",
        padding: "24px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
        styles={{ body: { padding: "36px 32px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#e6f4ff",
              color: "#1677ff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            <BankOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            School ERP Portal
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Sign in with your Email, Username, Phone, or Admission No
          </Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="identifier"
            label="Email, Username, or Phone Number"
            rules={[
              { required: true, message: "Please enter your username, email, or phone number" },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              placeholder="e.g. rahul12, 9876543210, PAR1001, or email"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please enter your password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<SafetyCertificateOutlined />}
              style={{ height: 44, fontWeight: 600 }}
            >
              Log In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: "20px 0" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            INSTITUTION SETUP
          </Text>
        </Divider>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Are you an institution founder or chairman?{" "}
          </Text>
          <Link
            href="/register-chairman"
            style={{ fontWeight: 600, color: "#1677ff" }}
          >
            Register School
          </Link>
        </div>
      </Card>
    </div>
  );
}
