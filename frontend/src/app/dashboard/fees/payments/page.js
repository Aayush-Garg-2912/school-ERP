"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Descriptions,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  message,
} from "antd";
import {
  CreditCardOutlined,
  PrinterOutlined,
  RollbackOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import api from "@/lib/api";

const { Title, Text } = Typography;

export default function FeePaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/fee-payments");
      if (data.success) {
        setPayments(data.data.payments || []);
      }
    } catch (err) {
      message.error("Failed to load fee payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRefundPayment = async (paymentId) => {
    try {
      const { data } = await api.delete(`/fee-payments/${paymentId}`);
      if (data.success) {
        message.success("Fee payment refunded successfully");
        fetchPayments();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to refund payment");
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const columns = [
    {
      title: "Receipt No",
      dataIndex: "receiptNumber",
      key: "receiptNumber",
      render: (rec) => <Tag color="geekblue" style={{ fontWeight: 600 }}>{rec}</Tag>,
    },
    {
      title: "Student Name",
      key: "student",
      render: (_, r) => (
        <div>
          <Text strong>{r.student?.firstName || ""} {r.student?.lastName || ""}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Adm: {r.student?.admissionNumber || "N/A"}
          </Text>
        </div>
      ),
    },
    {
      title: "Amount Paid",
      dataIndex: "amount",
      key: "amount",
      render: (amt) => (
        <Text strong style={{ color: "#52c41a", fontSize: 14 }}>
          ₹{(amt || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Payment Mode",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (m) => <Tag color="cyan">{m?.toUpperCase()}</Tag>,
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (d) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Collected By",
      key: "collectedBy",
      render: (_, r) => r.collectedBy?.name || "Counter Cashier",
    },
    {
      title: "Transaction Ref",
      dataIndex: "transactionId",
      key: "transactionId",
      render: (tid) => tid || <Text type="secondary">—</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setCurrentReceipt(r);
              setReceiptModalOpen(true);
            }}
          >
            Receipt
          </Button>
          <Popconfirm
            title="Refund payment?"
            description="Reverses the collection back to the student's due balance."
            onConfirm={() => handleRefundPayment(r._id)}
            okText="Yes, Refund"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<RollbackOutlined />}>
              Refund
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Payment Receipts & Collections Ledger
            </Title>
            <Text type="secondary">
              Total Recorded Payments: {payments.length} | Cumulative Collection: ₹{totalCollected.toLocaleString()}
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchPayments}>
                Refresh
              </Button>
              <Link href="/dashboard/fees">
                <Button type="primary">
                  Fee Allocations & Dues
                </Button>
              </Link>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={payments}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 12 }}
        />
      </Card>

      {/* Official Receipt Modal */}
      <Modal
        title="Official School Fee Payment Receipt"
        open={receiptModalOpen}
        onCancel={() => setReceiptModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalOpen(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Receipt
          </Button>,
        ]}
      >
        {currentReceipt && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Tag color="geekblue" style={{ fontSize: 14, padding: "4px 12px" }}>
                RECEIPT NO: {currentReceipt.receiptNumber}
              </Tag>
              <br />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "inline-block" }}>
                Date: {dayjs(currentReceipt.paymentDate).format("DD MMMM YYYY")}
              </Text>
            </div>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Amount Collected">
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  ₹{(currentReceipt.amount || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color="cyan">{currentReceipt.paymentMethod?.toUpperCase()}</Tag>
              </Descriptions.Item>
              {currentReceipt.transactionId && (
                <Descriptions.Item label="Transaction Reference">
                  {currentReceipt.transactionId}
                </Descriptions.Item>
              )}
              {currentReceipt.remarks && (
                <Descriptions.Item label="Remarks">
                  {currentReceipt.remarks}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
