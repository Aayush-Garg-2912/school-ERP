"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Row, Col, Divider } from "antd";
import {
  BankOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const { Title, Text } = Typography;

export default function RegisterChairmanPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { registerChairman } = useAuth();
  const router = useRouter();

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      await registerChairman(values);
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Failed to register institution"
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
        padding: "32px 16px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 680,
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
            Register New School Institution
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Set up your institution and configure the Chairman administrative account
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
          name="register_chairman_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          size="middle"
        >
          <Divider orientation="left" style={{ borderColor: "#e5e7eb" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1677ff" }}>
              1. School Details
            </span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="schoolName"
                label="School / Institution Name"
                rules={[{ required: true, message: "Please enter school name" }]}
              >
                <Input
                  prefix={<BankOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="e.g. St. Xavier International Academy"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name="schoolCode"
                label="School Code"
                rules={[
                  { required: true, message: "Enter unique code" },
                  { min: 2, max: 10, message: "2-10 chars" },
                ]}
              >
                <Input
                  prefix={<BarcodeOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="e.g. SXIA"
                  style={{ textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Institution Phone">
                <Input
                  prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="+91 98765 43210"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="address" label="Institution Address">
                <Input
                  prefix={<EnvironmentOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="City, State, Country"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ borderColor: "#e5e7eb", marginTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1677ff" }}>
              2. Chairman Account
            </span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="name"
                label="Chairman Full Name"
                rules={[{ required: true, message: "Please enter your name" }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="e.g. Dr. Rajesh Sharma"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Official Email (Login ID)"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Invalid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="chairman@school.edu"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please enter password" },
                  { min: 6, message: "At least 6 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="••••••••"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Please confirm password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match!"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="••••••••"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<CheckCircleOutlined />}
              style={{ height: 44, fontWeight: 600, fontSize: 15 }}
            >
              Complete Registration & Launch Dashboard
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already have an active institution account?{" "}
          </Text>
          <Link href="/login" style={{ fontWeight: 600, color: "#1677ff" }}>
            Sign In Here
          </Link>
        </div>
      </Card>
    </div>
  );
}
